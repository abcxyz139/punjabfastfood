import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CustomerOrderInputSchema } from "./admin.schemas";
import { isAvailableNow } from "./menu.types";
import { evaluateLoyalty } from "./loyalty.server";
import { applyPromotions, fetchPromotions, loadItemMeta, type EngineLine } from "./marketing.server";



function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const createCustomerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CustomerOrderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Recalculate pricing server-side — never trust client prices.
    const itemIds = Array.from(new Set(data.items.map((i) => i.menuItemId)));
    const variantIds = Array.from(
      new Set(
        data.items
          .map((i) => i.variantId)
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );
    const addonIds = Array.from(new Set(data.items.flatMap((i) => i.addonIds ?? [])));

    const [menuRes, variantsRes, addonsRes] = await Promise.all([
      context.supabase.from("menu_items").select("id,name,price,active,in_stock,category_id,available_days,available_from,available_until").in("id", itemIds),
      variantIds.length
        ? context.supabase
            .from("menu_item_variants")
            .select("id,menu_item_id,name,price,available")
            .in("id", variantIds)
        : Promise.resolve({ data: [], error: null } as const),
      addonIds.length
        ? context.supabase
            .from("menu_item_addons")
            .select("id,menu_item_id,name,price,available")
            .in("id", addonIds)
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (menuRes.error) throw new Error(menuRes.error.message);
    if (variantsRes.error) throw new Error(variantsRes.error.message);
    if (addonsRes.error) throw new Error(addonsRes.error.message);

    const menuById = new Map((menuRes.data ?? []).map((r) => [r.id, r]));
    const variantById = new Map((variantsRes.data ?? []).map((r) => [r.id, r]));
    const addonById = new Map((addonsRes.data ?? []).map((r) => [r.id, r]));

    const lineItems: Array<{
      menuItemId: string;
      name: string;
      variantId: string | null;
      variantName: string | null;
      addons: Array<{ id: string; name: string; price: number }>;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      notes?: string | null;
    }> = [];

    for (const it of data.items) {
      const row = menuById.get(it.menuItemId);
      if (!row || row.active === false) throw new Error("One or more items are unavailable.");
      if (row.in_stock === false) throw new Error(`${row.name} is sold out.`);
      if (
        !isAvailableNow({
          days: row.available_days ?? [],
          from: row.available_from ? String(row.available_from).slice(0, 5) : null,
          until: row.available_until ? String(row.available_until).slice(0, 5) : null,
        })
      ) {
        throw new Error(`${row.name} is not being served right now.`);
      }


      let unitPrice = Number(row.price);
      let variantName: string | null = null;
      if (it.variantId) {
        const v = variantById.get(it.variantId);
        if (!v || v.menu_item_id !== it.menuItemId || v.available === false) {
          throw new Error("Selected option is unavailable.");
        }
        unitPrice = Number(v.price);
        variantName = v.name;
      }

      const resolvedAddons: Array<{ id: string; name: string; price: number }> = [];
      for (const aid of it.addonIds ?? []) {
        const a = addonById.get(aid);
        if (!a || a.menu_item_id !== it.menuItemId || a.available === false) {
          throw new Error("Selected add-on is unavailable.");
        }
        const price = Number(a.price);
        resolvedAddons.push({ id: a.id, name: a.name, price });
        unitPrice += price;
      }

      const lineTotal = round2(unitPrice * it.quantity);
      lineItems.push({
        menuItemId: row.id,
        name: row.name,
        variantId: it.variantId ?? null,
        variantName,
        addons: resolvedAddons,
        unitPrice: round2(unitPrice),
        quantity: it.quantity,
        lineTotal,
        notes: it.notes?.trim() ? it.notes.trim() : null,
      });
    }

    const subtotal = round2(lineItems.reduce((s, l) => s + l.lineTotal, 0));

    // ---- Loyalty reward redemption (server-side only; client prices are ignored) ----
    let discount = 0;
    let redeemedRewardId: string | null = null;
    if (data.loyaltyRewardId) {
      const { data: reward, error: rewardError } = await context.supabase
        .from("loyalty_rewards")
        .select("id,status,reward_type,reward_value,expires_at,program_id")
        .eq("id", data.loyaltyRewardId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (rewardError) throw new Error(rewardError.message);
      if (!reward || reward.status !== "unlocked") throw new Error("That reward is no longer available.");
      if (reward.expires_at && new Date(reward.expires_at).getTime() < Date.now()) {
        throw new Error("That reward has expired.");
      }

      const value = Number(reward.reward_value);
      if (reward.reward_type === "percent") {
        discount = round2((subtotal * Math.min(100, value)) / 100);
      } else if (reward.reward_type === "fixed") {
        discount = round2(Math.min(value, subtotal));
      } else if (reward.reward_type === "free_product") {
        const { data: program } = await context.supabase
          .from("loyalty_programs")
          .select("reward_menu_item_id")
          .eq("id", reward.program_id)
          .maybeSingle();
        const freeId = program?.reward_menu_item_id ?? null;
        const match = freeId
          ? lineItems.find((l) => l.menuItemId === freeId)
          : [...lineItems].sort((a, b) => a.unitPrice - b.unitPrice)[0];
        discount = match ? round2(Math.min(match.unitPrice, subtotal)) : 0;
      }
      redeemedRewardId = reward.id;
    }

    // ---- Marketing Engine (campaigns, bundles, buy X get Y, spend rewards) ----
    // Evaluated entirely here: the browser never sends discount amounts.
    const engineLines: EngineLine[] = lineItems.map((l) => ({
      menuItemId: l.menuItemId,
      variantId: l.variantId,
      categoryId: menuById.get(l.menuItemId)?.category_id ?? null,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    }));

    let promoDiscount = 0;
    let appliedPromotions: Array<{ promotionId: string; label: string; discount: number }> = [];
    let promoFreeDelivery = false;
    try {
      const allPromotions = await fetchPromotions(context.supabase, { onlyActive: true });

      // Per-customer redemption caps.
      const { data: myRedemptions } = await context.supabase
        .from("promotion_redemptions")
        .select("promotion_id")
        .eq("user_id", context.userId);
      const usedByPromo = new Map<string, number>();
      for (const r of myRedemptions ?? []) {
        if (!r.promotion_id) continue;
        usedByPromo.set(r.promotion_id, (usedByPromo.get(r.promotion_id) ?? 0) + 1);
      }
      const promotions = allPromotions.filter(
        (p) => p.perCustomerLimit === null || (usedByPromo.get(p.id) ?? 0) < p.perCustomerLimit,
      );

      const referenced = new Set<string>(engineLines.map((l) => l.menuItemId));
      for (const p of promotions) {
        if (p.getMenuItemId) referenced.add(p.getMenuItemId);
        for (const i of p.items) referenced.add(i.menuItemId);
      }
      const itemMeta = await loadItemMeta(context.supabase, Array.from(referenced));

      const quote = applyPromotions({
        promotions,
        lines: engineLines,
        subtotal,
        delivery: 0,
        itemMeta,
        userId: context.userId,
      });
      // Promotions apply to what is left after a redeemed loyalty reward.
      promoDiscount = round2(Math.min(quote.promoDiscount, Math.max(0, subtotal - discount)));
      promoFreeDelivery = quote.freeDelivery;
      appliedPromotions = quote.applied.map((a) => ({
        promotionId: a.promotionId,
        label: a.label,
        discount: a.discount,
      }));
    } catch {
      promoDiscount = 0;
      appliedPromotions = [];
    }

    const totalDiscount = round2(discount + promoDiscount);
    const total = round2(Math.max(0, subtotal - totalDiscount));

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        items: lineItems,
        subtotal,
        discount: totalDiscount,
        total,
        notes: data.notes ?? null,
      })
      .select("id,total,status,created_at")
      .single();


    if (error) throw new Error(error.message);

    // Loyalty bookkeeping runs with elevated rights so customers can never edit progress.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (redeemedRewardId) {
      await supabaseAdmin
        .from("loyalty_rewards")
        .update({ status: "redeemed", redeemed_order_id: order.id })
        .eq("id", redeemedRewardId)
        .eq("user_id", context.userId);
    }

    // Campaign bookkeeping: redemption records + usage counters (admin rights only).
    if (appliedPromotions.length > 0) {
      try {
        await supabaseAdmin.from("promotion_redemptions").insert(
          appliedPromotions.map((a) => ({
            promotion_id: a.promotionId,
            order_id: order.id,
            user_id: context.userId,
            customer_phone: data.customerPhone,
            discount_amount: a.discount,
            label: a.label,
          })),
        );
        for (const a of appliedPromotions) {
          const { data: current } = await supabaseAdmin
            .from("promotions")
            .select("usage_count")
            .eq("id", a.promotionId)
            .maybeSingle();
          await supabaseAdmin
            .from("promotions")
            .update({ usage_count: Number(current?.usage_count ?? 0) + 1 })
            .eq("id", a.promotionId);
        }
      } catch {
        // Analytics must never block a customer's order.
      }
    }

    let unlocked: unknown[] = [];
    try {
      unlocked = await evaluateLoyalty(
        context.supabase,
        supabaseAdmin as never,
        context.userId,
        data.customerPhone,
      );
    } catch {
      unlocked = [];
    }

    return {
      id: order.id,
      total: Number(order.total),
      discount: totalDiscount,
      loyaltyDiscount: discount,
      promoDiscount,
      freeDelivery: promoFreeDelivery,
      appliedPromotions,
      status: order.status,
      createdAt: order.created_at,

      unlockedRewards: unlocked.length,
    };
  });

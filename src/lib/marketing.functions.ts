// Thin server-function wrappers only. Runtime helpers live in *.server.ts and
// schemas in *.schemas.ts so the server-fn split can never strip them.
import { createServerFn } from "@tanstack/react-start";
import {
  applyPromotions,
  badgeMap,
  fetchPromotions,
  loadItemMeta,
} from "./marketing.server";
import { adminSnapshot, buildLines } from "./marketing-lines.server";
import { publicClient, type CloudClient } from "./supabase-public.server";
import {
  PromotionIdSchema,
  PromotionPreviewSchema,
  PromotionSlugSchema,
  QuoteCartSchema,
} from "./cart.schemas";
import type { CartQuote, Promotion, StorefrontMarketing } from "./marketing.types";
import { promotionRunning } from "./marketing.types";
import { requireAdmin } from "./admin.server";
import { PromotionInputSchema } from "./admin.schemas";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------ Storefront ------------------------------ */

/** Active campaigns + per-product badges for the menu, offers strip and popup. */
export const getStorefrontMarketing = createServerFn({ method: "GET" }).handler(
  async (): Promise<StorefrontMarketing> => {
    const supabase = publicClient();
    const promotions = (await fetchPromotions(supabase, { onlyActive: true })).filter((p) =>
      promotionRunning(p),
    );

    const referenced = new Set<string>();
    for (const p of promotions) {
      if (p.getMenuItemId) referenced.add(p.getMenuItemId);
      for (const i of p.items) referenced.add(i.menuItemId);
      for (const i of p.targetMenuItemIds) referenced.add(i);
    }

    const [itemsRes, variantsRes, metaMap] = await Promise.all([
      supabase.from("menu_items").select("id,name,category_id").eq("active", true),
      supabase.from("menu_item_variants").select("id,menu_item_id"),
      loadItemMeta(supabase, Array.from(referenced)),
    ]);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    if (variantsRes.error) throw new Error(variantsRes.error.message);

    const itemNames: Record<string, string> = {};
    for (const [id, m] of metaMap.entries()) itemNames[id] = m.name;
    for (const r of itemsRes.data ?? []) itemNames[r.id] = r.name;

    const variantsByItem = new Map<string, string[]>();
    for (const v of variantsRes.data ?? []) {
      variantsByItem.set(v.menu_item_id, [...(variantsByItem.get(v.menu_item_id) ?? []), v.id]);
    }

    const badges = badgeMap(
      promotions,
      (itemsRes.data ?? []).map((r) => ({
        id: r.id,
        categoryId: r.category_id,
        variantIds: variantsByItem.get(r.id) ?? [],
      })),
      itemNames,
    );

    return { promotions, badges, itemNames };
  },
);

/**
 * Authoritative cart pricing. The browser only sends ids and quantities;
 * every price, discount and reward is computed here.
 */
export const quoteCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => QuoteCartSchema.parse(input))
  .handler(async ({ data }): Promise<CartQuote> => {
    const supabase = publicClient();
    const settingsRes = await supabase
      .from("business_settings")
      .select("delivery_charges")
      .eq("id", "default")
      .maybeSingle();
    const delivery = Number(settingsRes.data?.delivery_charges ?? 0);

    if (data.items.length === 0) {
      return {
        subtotal: 0,
        promoDiscount: 0,
        delivery: 0,
        freeDelivery: false,
        total: 0,
        applied: [],
        suggestions: [],
      };
    }

    const { lines, subtotal } = await buildLines(supabase, data.items);
    const promotions = await fetchPromotions(supabase, { onlyActive: true });
    const referenced = new Set<string>(lines.map((l) => l.menuItemId));
    for (const p of promotions) {
      if (p.getMenuItemId) referenced.add(p.getMenuItemId);
      for (const i of p.items) referenced.add(i.menuItemId);
    }
    const itemMeta = await loadItemMeta(supabase, Array.from(referenced));

    return applyPromotions({
      promotions,
      lines,
      subtotal,
      delivery,
      itemMeta,
      userId: data.userId ?? null,
    });
  });

/** Single campaign page (SEO landing) — public, read only. */
export const getPromotionBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => PromotionSlugSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const promotions = await fetchPromotions(supabase, { onlyActive: true });
    const promotion = promotions.find((p) => p.slug === data.slug) ?? null;
    type PromoPageItem = { id: string; name: string; description: string; price: number; imageKey: string };
    if (!promotion) {
      return {
        promotion: null as Promotion | null,
        items: [] as PromoPageItem[],
        itemNames: {} as Record<string, string>,
      };
    }

    const ids = new Set<string>([...promotion.targetMenuItemIds, ...promotion.items.map((i) => i.menuItemId)]);
    if (promotion.getMenuItemId) ids.add(promotion.getMenuItemId);

    const { data: rows } = await supabase
      .from("menu_items")
      .select("id,name,description,price,image_key")
      .eq("active", true)
      .in("id", Array.from(ids.size ? ids : new Set(["00000000-0000-0000-0000-000000000000"])));

    const itemNames: Record<string, string> = {};
    for (const r of rows ?? []) itemNames[r.id] = r.name;

    return {
      promotion: promotion as Promotion | null,
      items: (rows ?? []).map((r): PromoPageItem => ({
        id: r.id,
        name: r.name,
        description: r.description,
        price: Number(r.price),
        imageKey: r.image_key,
      })),
      itemNames,
    };
  });

/* -------------------------------- Admin -------------------------------- */

export const getMarketingAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return adminSnapshot(context.supabase);
  });

export const upsertPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromotionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const payload = {
      name: data.name,
      slug: data.slug,
      promo_type: data.promoType,
      headline: data.headline,
      description: data.description,
      image_key: data.imageKey,
      badge_label: data.badgeLabel,
      target_scope: data.targetScope,
      target_category_ids: data.targetCategoryIds,
      target_menu_item_ids: data.targetMenuItemIds,
      target_variant_ids: data.targetVariantIds,
      discount_value: data.discountValue,
      min_order_amount: data.minOrderAmount,
      buy_quantity: data.buyQuantity,
      get_quantity: data.getQuantity,
      get_menu_item_id: data.getMenuItemId ?? null,
      get_discount_percent: data.getDiscountPercent,
      bundle_price: data.bundlePrice ?? null,
      free_delivery: data.freeDelivery,
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
      start_time: data.startTime ?? null,
      end_time: data.endTime ?? null,
      days_of_week: data.daysOfWeek,
      usage_limit: data.usageLimit ?? null,
      per_customer_limit: data.perCustomerLimit ?? null,
      stock_limit: data.stockLimit ?? null,
      campaign: data.campaign,
      season: data.season,
      priority: data.priority,
      stack_mode: data.stackMode,
      applicable_customer_ids: data.applicableCustomerIds,
      active: data.active,
      featured: data.featured,
      seo_title: data.seoTitle,
      seo_description: data.seoDescription,
    };

    let promotionId = data.id ?? null;
    if (promotionId) {
      const { error } = await context.supabase.from("promotions").update(payload).eq("id", promotionId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("promotions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      promotionId = inserted.id;
    }

    // Bundle / buy / get composition is replaced wholesale on every save.
    const del = await context.supabase.from("promotion_items").delete().eq("promotion_id", promotionId);
    if (del.error) throw new Error(del.error.message);
    if (data.items.length > 0) {
      const { error } = await context.supabase.from("promotion_items").insert(
        data.items.map((i) => ({
          promotion_id: promotionId,
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
          role: i.role,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return adminSnapshot(context.supabase);
  });

export const deletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromotionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("promotions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return adminSnapshot(context.supabase);
  });

/** Dry-run a campaign against a sample cart so the owner can sanity check rules. */
export const previewPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromotionPreviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const promotions = await fetchPromotions(context.supabase);
    const promotion = promotions.find((p) => p.id === data.promotionId);
    if (!promotion) throw new Error("Campaign not found.");

    const { lines, subtotal } = await buildLines(context.supabase as unknown as CloudClient, data.items);
    const referenced = new Set<string>(lines.map((l) => l.menuItemId));
    if (promotion.getMenuItemId) referenced.add(promotion.getMenuItemId);
    for (const i of promotion.items) referenced.add(i.menuItemId);
    const itemMeta = await loadItemMeta(context.supabase, Array.from(referenced));

    const quote = applyPromotions({
      promotions: [{ ...promotion, active: true } as Promotion],
      lines,
      subtotal,
      delivery: 0,
      itemMeta,
      userId: context.userId,
    });
    return { quote, running: promotionRunning(promotion) };
  });

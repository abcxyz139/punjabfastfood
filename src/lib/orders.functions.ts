import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CustomerOrderInputSchema } from "./admin.schemas";

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
      context.supabase.from("menu_items").select("id,name,price,active").in("id", itemIds),
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
    }> = [];

    for (const it of data.items) {
      const row = menuById.get(it.menuItemId);
      if (!row || row.active === false) throw new Error("One or more items are unavailable.");

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
      });
    }

    const subtotal = round2(lineItems.reduce((s, l) => s + l.lineTotal, 0));
    const discount = 0;
    const total = round2(subtotal - discount);

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        items: lineItems,
        subtotal,
        discount,
        total,
        notes: data.notes ?? null,
      })
      .select("id,total,status,created_at")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      createdAt: order.created_at,
    };
  });

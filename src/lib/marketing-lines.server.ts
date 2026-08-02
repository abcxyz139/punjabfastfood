// Server-only helpers pulled out of marketing.functions.ts.
// Server-function modules must stay thin wrappers: any runtime sibling declared
// next to a createServerFn call can be stripped by the server-fn split and blow
// up at runtime with a ReferenceError.
import type { CartLineInput } from "./cart.schemas";
import { round2, sum2 } from "./money";
import type { CloudClient } from "./supabase-public.server";
import {
  fetchPromotions,
  loadMarketingAnalytics,
  type EngineLine,
} from "./marketing.server";

/** Builds priced cart lines straight from the database — client prices are never used. */
export async function buildLines(supabase: CloudClient, items: CartLineInput[]) {
  const itemIds = Array.from(new Set(items.map((i) => i.menuItemId)));
  const variantIds = Array.from(
    new Set(items.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
  );
  const addonIds = Array.from(new Set(items.flatMap((i) => i.addonIds ?? [])));

  const [menuRes, variantRes, addonRes] = await Promise.all([
    supabase.from("menu_items").select("id,name,price,category_id").in("id", itemIds),
    variantIds.length
      ? supabase.from("menu_item_variants").select("id,menu_item_id,price").in("id", variantIds)
      : Promise.resolve({ data: [], error: null } as const),
    addonIds.length
      ? supabase.from("menu_item_addons").select("id,menu_item_id,price").in("id", addonIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);
  if (menuRes.error) throw new Error(menuRes.error.message);
  if (variantRes.error) throw new Error(variantRes.error.message);
  if (addonRes.error) throw new Error(addonRes.error.message);

  const menuById = new Map((menuRes.data ?? []).map((r) => [r.id, r]));
  const variantById = new Map((variantRes.data ?? []).map((r) => [r.id, r]));
  const addonById = new Map((addonRes.data ?? []).map((r) => [r.id, r]));

  const lines: EngineLine[] = [];
  for (const it of items) {
    const row = menuById.get(it.menuItemId);
    if (!row) continue;
    let unitPrice = Number(row.price);
    if (it.variantId) {
      const v = variantById.get(it.variantId);
      if (v) unitPrice = Number(v.price);
    }
    for (const aid of it.addonIds ?? []) {
      const a = addonById.get(aid);
      if (a) unitPrice += Number(a.price);
    }
    lines.push({
      menuItemId: row.id,
      variantId: it.variantId ?? null,
      categoryId: row.category_id,
      name: row.name,
      unitPrice: round2(unitPrice),
      quantity: it.quantity,
      lineTotal: round2(unitPrice * it.quantity),
    });
  }

  return { lines, subtotal: sum2(lines.map((l) => l.lineTotal)) };
}

/** Campaigns + analytics payload the admin Marketing tab renders. */
export async function adminSnapshot(supabase: Parameters<typeof fetchPromotions>[0]) {
  const promotions = await fetchPromotions(supabase);
  const analytics = await loadMarketingAnalytics(supabase, promotions);
  return { promotions, analytics };
}

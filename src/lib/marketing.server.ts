import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AppliedPromotion,
  CartQuote,
  Promotion,
  PromoScope,
  PromoSuggestion,
  PromotionBadge,
  PromotionItem,
  PromoType,
} from "./marketing.types";
import { promotionLabel, promotionRunning, remainingStock } from "./marketing.types";

type CloudClient = SupabaseClient<Database>;

export const PROMO_COLUMNS =
  "id,name,slug,promo_type,headline,description,image_key,badge_label,target_scope,target_category_ids,target_menu_item_ids,target_variant_ids,discount_value,min_order_amount,buy_quantity,get_quantity,get_menu_item_id,get_discount_percent,bundle_price,free_delivery,starts_at,ends_at,start_time,end_time,days_of_week,usage_limit,usage_count,per_customer_limit,stock_limit,campaign,season,priority,stack_mode,applicable_customer_ids,active,featured,seo_title,seo_description";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* ------------------------------- Row mapping ------------------------------- */

type PromoRow = Record<string, unknown>;

export function mapPromotion(row: PromoRow, items: PromotionItem[] = []): Promotion {
  const num = (v: unknown, fallback = 0) => (v === null || v === undefined ? fallback : Number(v));
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
  return {
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    slug: String(row["slug"] ?? ""),
    promoType: (row["promo_type"] ?? "percent") as PromoType,
    headline: String(row["headline"] ?? ""),
    description: String(row["description"] ?? ""),
    imageKey: String(row["image_key"] ?? ""),
    badgeLabel: String(row["badge_label"] ?? ""),
    targetScope: (row["target_scope"] ?? "store") as PromoScope,
    targetCategoryIds: arr(row["target_category_ids"]),
    targetMenuItemIds: arr(row["target_menu_item_ids"]),
    targetVariantIds: arr(row["target_variant_ids"]),
    discountValue: num(row["discount_value"]),
    minOrderAmount: num(row["min_order_amount"]),
    buyQuantity: num(row["buy_quantity"]),
    getQuantity: num(row["get_quantity"]),
    getMenuItemId: (row["get_menu_item_id"] as string | null) ?? null,
    getDiscountPercent: num(row["get_discount_percent"]),
    bundlePrice: row["bundle_price"] === null || row["bundle_price"] === undefined ? null : Number(row["bundle_price"]),
    freeDelivery: Boolean(row["free_delivery"]),
    startsAt: (row["starts_at"] as string | null) ?? null,
    endsAt: (row["ends_at"] as string | null) ?? null,
    startTime: row["start_time"] ? String(row["start_time"]).slice(0, 5) : null,
    endTime: row["end_time"] ? String(row["end_time"]).slice(0, 5) : null,
    daysOfWeek: Array.isArray(row["days_of_week"]) ? (row["days_of_week"] as number[]) : [],
    usageLimit: (row["usage_limit"] as number | null) ?? null,
    usageCount: num(row["usage_count"]),
    perCustomerLimit: (row["per_customer_limit"] as number | null) ?? null,
    stockLimit: (row["stock_limit"] as number | null) ?? null,
    campaign: String(row["campaign"] ?? ""),
    season: String(row["season"] ?? ""),
    priority: num(row["priority"], 100),
    stackMode: (row["stack_mode"] ?? "stackable") as Promotion["stackMode"],
    applicableCustomerIds: arr(row["applicable_customer_ids"]),
    active: Boolean(row["active"]),
    featured: Boolean(row["featured"]),
    seoTitle: String(row["seo_title"] ?? ""),
    seoDescription: String(row["seo_description"] ?? ""),
    items,
  };
}

/** Loads promotions plus their bundle / buy / get item rows in two queries. */
export async function fetchPromotions(
  supabase: CloudClient,
  opts: { onlyActive?: boolean } = {},
): Promise<Promotion[]> {
  let query = supabase.from("promotions").select(PROMO_COLUMNS).order("priority", { ascending: true });
  if (opts.onlyActive) query = query.eq("active", true);
  const [promoRes, itemRes] = await Promise.all([
    query,
    supabase.from("promotion_items").select("id,promotion_id,menu_item_id,quantity,role"),
  ]);
  if (promoRes.error) throw new Error(promoRes.error.message);
  if (itemRes.error) throw new Error(itemRes.error.message);

  const byPromo = new Map<string, PromotionItem[]>();
  for (const r of itemRes.data ?? []) {
    const list = byPromo.get(r.promotion_id) ?? [];
    list.push({
      id: r.id,
      menuItemId: r.menu_item_id,
      quantity: r.quantity,
      role: r.role as PromotionItem["role"],
    });
    byPromo.set(r.promotion_id, list);
  }

  return (promoRes.data ?? []).map((r) =>
    mapPromotion(r as PromoRow, byPromo.get(String((r as PromoRow)["id"])) ?? []),
  );
}

/* --------------------------------- Engine ---------------------------------- */

export type EngineLine = {
  menuItemId: string;
  variantId: string | null;
  categoryId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type ItemMeta = { name: string; price: number; categoryId: string | null };

function matches(p: Promotion, line: EngineLine): boolean {
  switch (p.targetScope) {
    case "store":
      return true;
    case "category":
      return Boolean(line.categoryId && p.targetCategoryIds.includes(line.categoryId));
    case "product":
      return p.targetMenuItemIds.includes(line.menuItemId);
    case "variant":
      return Boolean(line.variantId && p.targetVariantIds.includes(line.variantId));
  }
}

/** Quantity that counts toward a Buy X rule: explicit "buy" items win over scope. */
function qualifyingQty(p: Promotion, lines: EngineLine[]) {
  const buyItems = p.items.filter((i) => i.role === "buy");
  if (buyItems.length > 0) {
    const ids = new Set(buyItems.map((i) => i.menuItemId));
    return lines.filter((l) => ids.has(l.menuItemId)).reduce((s, l) => s + l.quantity, 0);
  }
  return lines.filter((l) => matches(p, l)).reduce((s, l) => s + l.quantity, 0);
}

function eligibleSubtotal(p: Promotion, lines: EngineLine[]) {
  return round2(lines.filter((l) => matches(p, l)).reduce((s, l) => s + l.lineTotal, 0));
}

type Outcome = { discount: number; freeItems: AppliedPromotion["freeItems"]; freeDelivery: boolean };

const NONE: Outcome = { discount: 0, freeItems: [], freeDelivery: false };

function freeItemOutcome(p: Promotion, meta: Map<string, ItemMeta>, units: number): Outcome {
  if (!p.getMenuItemId || units <= 0) return NONE;
  const item = meta.get(p.getMenuItemId);
  if (!item) return NONE;
  // The free product is given away — its value is deducted so the customer sees the saving.
  return {
    discount: round2(item.price * units),
    freeItems: [{ name: item.name, quantity: units }],
    freeDelivery: false,
  };
}

/** Computes what a single promotion gives this cart. Pure, server-side only. */
function evaluateOne(
  p: Promotion,
  lines: EngineLine[],
  subtotal: number,
  meta: Map<string, ItemMeta>,
): Outcome {
  const eligible = eligibleSubtotal(p, lines);

  switch (p.promoType) {
    case "percent": {
      if (subtotal < p.minOrderAmount || eligible <= 0) return NONE;
      return { ...NONE, discount: round2((eligible * Math.min(100, p.discountValue)) / 100) };
    }
    case "fixed": {
      if (subtotal < p.minOrderAmount || eligible <= 0) return NONE;
      return { ...NONE, discount: round2(Math.min(p.discountValue, eligible)) };
    }
    case "free_delivery": {
      if (subtotal < p.minOrderAmount) return NONE;
      return { ...NONE, freeDelivery: true };
    }
    case "free_item": {
      if (subtotal < p.minOrderAmount) return NONE;
      return freeItemOutcome(p, meta, Math.max(1, p.getQuantity));
    }
    case "order_value": {
      if (p.minOrderAmount <= 0 || subtotal < p.minOrderAmount) return NONE;
      if (p.getMenuItemId) return freeItemOutcome(p, meta, Math.max(1, p.getQuantity));
      if (p.freeDelivery) return { ...NONE, freeDelivery: true };
      if (p.discountValue > 0) {
        return { ...NONE, discount: round2((subtotal * Math.min(100, p.discountValue)) / 100) };
      }
      return NONE;
    }
    case "buy_x_get_y": {
      if (p.buyQuantity <= 0) return NONE;
      const cycles = Math.floor(qualifyingQty(p, lines) / p.buyQuantity);
      if (cycles <= 0) return NONE;
      if (p.getDiscountPercent > 0) {
        return { ...NONE, discount: round2((eligible * Math.min(100, p.getDiscountPercent)) / 100) };
      }
      return freeItemOutcome(p, meta, cycles * Math.max(1, p.getQuantity));
    }
    case "bundle": {
      const parts = p.items.filter((i) => i.role === "bundle");
      if (parts.length === 0 || p.bundlePrice === null) return NONE;
      let sets = Infinity;
      let normal = 0;
      for (const part of parts) {
        const have = lines
          .filter((l) => l.menuItemId === part.menuItemId)
          .reduce((s, l) => s + l.quantity, 0);
        const need = Math.max(1, part.quantity);
        sets = Math.min(sets, Math.floor(have / need));
        const unit =
          lines.find((l) => l.menuItemId === part.menuItemId)?.unitPrice ??
          meta.get(part.menuItemId)?.price ??
          0;
        normal += unit * need;
      }
      if (!Number.isFinite(sets) || sets <= 0) return NONE;
      const saving = Math.max(0, normal - p.bundlePrice);
      return { ...NONE, discount: round2(saving * sets) };
    }
  }
}

/** Nudges for promotions the cart nearly qualifies for. */
function buildSuggestions(
  promotions: Promotion[],
  applied: Set<string>,
  lines: EngineLine[],
  subtotal: number,
  meta: Map<string, ItemMeta>,
): PromoSuggestion[] {
  const out: PromoSuggestion[] = [];
  for (const p of promotions) {
    if (applied.has(p.id)) continue;
    const label = promotionLabel(
      p,
      Object.fromEntries(Array.from(meta.entries()).map(([k, v]) => [k, v.name])),
    );

    if (p.minOrderAmount > 0 && subtotal < p.minOrderAmount && subtotal > 0) {
      const gap = round2(p.minOrderAmount - subtotal);
      out.push({
        promotionId: p.id,
        name: p.name,
        message: `Only $${gap.toFixed(2)} more to unlock ${label}`,
        addMenuItemId: p.getMenuItemId,
        saving: p.getMenuItemId ? (meta.get(p.getMenuItemId)?.price ?? 0) : 0,
      });
      continue;
    }

    if (p.promoType === "buy_x_get_y" && p.buyQuantity > 0) {
      const have = qualifyingQty(p, lines);
      if (have > 0 && have < p.buyQuantity) {
        out.push({
          promotionId: p.id,
          name: p.name,
          message: `Add ${p.buyQuantity - have} more to unlock ${label}`,
          addMenuItemId: p.items.find((i) => i.role === "buy")?.menuItemId ?? null,
          saving: p.getMenuItemId ? (meta.get(p.getMenuItemId)?.price ?? 0) : 0,
        });
      }
      continue;
    }

    if (p.promoType === "bundle" && p.bundlePrice !== null) {
      const parts = p.items.filter((i) => i.role === "bundle");
      if (parts.length < 2) continue;
      const missing = parts.filter(
        (part) =>
          lines.filter((l) => l.menuItemId === part.menuItemId).reduce((s, l) => s + l.quantity, 0) <
          Math.max(1, part.quantity),
      );
      const present = parts.length - missing.length;
      if (present > 0 && missing.length === 1) {
        const part = missing[0];
        const item = meta.get(part.menuItemId);
        const normal = parts.reduce(
          (s, x) => s + (meta.get(x.menuItemId)?.price ?? 0) * Math.max(1, x.quantity),
          0,
        );
        const saving = round2(Math.max(0, normal - p.bundlePrice));
        out.push({
          promotionId: p.id,
          name: p.name,
          message: `Add ${item?.name ?? "one more item"} → save $${saving.toFixed(2)} with ${p.name}`,
          addMenuItemId: part.menuItemId,
          saving,
        });
      }
    }
  }
  return out.slice(0, 3);
}

/**
 * Authoritative promotion evaluation. Priority ascending; an `exclusive`
 * campaign wins alone. Total discount can never exceed the subtotal.
 */
export function applyPromotions(args: {
  promotions: Promotion[];
  lines: EngineLine[];
  subtotal: number;
  delivery: number;
  itemMeta: Map<string, ItemMeta>;
  userId?: string | null;
  now?: Date;
}): CartQuote {
  const now = args.now ?? new Date();
  const itemNames = Object.fromEntries(
    Array.from(args.itemMeta.entries()).map(([k, v]) => [k, v.name]),
  );

  const live = args.promotions
    .filter((p) => promotionRunning(p, now))
    .filter(
      (p) =>
        p.applicableCustomerIds.length === 0 ||
        (args.userId ? p.applicableCustomerIds.includes(args.userId) : false),
    )
    .sort((a, b) => a.priority - b.priority);

  const applied: AppliedPromotion[] = [];
  let freeDelivery = false;

  for (const p of live) {
    const outcome = evaluateOne(p, args.lines, args.subtotal, args.itemMeta);
    if (outcome.discount <= 0 && !outcome.freeDelivery && outcome.freeItems.length === 0) continue;

    const entry: AppliedPromotion = {
      promotionId: p.id,
      name: p.name,
      label: promotionLabel(p, itemNames),
      discount: outcome.discount,
      freeItems: outcome.freeItems,
      freeDelivery: outcome.freeDelivery,
    };
    if (outcome.freeDelivery) freeDelivery = true;

    if (p.stackMode === "exclusive") {
      // Highest-priority exclusive campaign wins on its own.
      const promoDiscount = round2(Math.min(entry.discount, args.subtotal));
      const delivery = entry.freeDelivery ? 0 : args.delivery;
      return {
        subtotal: args.subtotal,
        promoDiscount,
        delivery,
        freeDelivery: entry.freeDelivery,
        total: round2(Math.max(0, args.subtotal - promoDiscount) + delivery),
        applied: [{ ...entry, discount: promoDiscount }],
        suggestions: buildSuggestions(live, new Set([p.id]), args.lines, args.subtotal, args.itemMeta),
      };
    }
    applied.push(entry);
  }

  const rawDiscount = applied.reduce((s, a) => s + a.discount, 0);
  const promoDiscount = round2(Math.min(rawDiscount, args.subtotal));
  const delivery = freeDelivery ? 0 : args.delivery;

  return {
    subtotal: args.subtotal,
    promoDiscount,
    delivery,
    freeDelivery,
    total: round2(Math.max(0, args.subtotal - promoDiscount) + delivery),
    applied,
    suggestions: buildSuggestions(
      live,
      new Set(applied.map((a) => a.promotionId)),
      args.lines,
      args.subtotal,
      args.itemMeta,
    ),
  };
}

/** Menu-item metadata needed by the engine, in one query. */
export async function loadItemMeta(supabase: CloudClient, ids: string[]) {
  const meta = new Map<string, ItemMeta>();
  if (ids.length === 0) return meta;
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,price,category_id")
    .in("id", ids);
  if (error) throw new Error(error.message);
  for (const r of data ?? []) {
    meta.set(r.id, { name: r.name, price: Number(r.price), categoryId: r.category_id });
  }
  return meta;
}

/** Which products each running campaign should badge on the storefront. */
export function badgeMap(
  promotions: Promotion[],
  items: Array<{ id: string; categoryId: string | null; variantIds: string[] }>,
  itemNames: Record<string, string>,
  now: Date = new Date(),
): Record<string, PromotionBadge[]> {
  const out: Record<string, PromotionBadge[]> = {};
  for (const p of promotions.filter((x) => promotionRunning(x, now))) {
    const badge: PromotionBadge = {
      promotionId: p.id,
      slug: p.slug,
      label: promotionLabel(p, itemNames),
      endsAt: p.endsAt,
      freeItemName: p.getMenuItemId ? (itemNames[p.getMenuItemId] ?? null) : null,
      remainingStock: remainingStock(p),
    };
    const bundleIds = new Set(p.items.map((i) => i.menuItemId));
    for (const item of items) {
      const hit =
        bundleIds.has(item.id) ||
        (p.targetScope === "store" && p.promoType !== "order_value") ||
        (p.targetScope === "category" && item.categoryId && p.targetCategoryIds.includes(item.categoryId)) ||
        (p.targetScope === "product" && p.targetMenuItemIds.includes(item.id)) ||
        (p.targetScope === "variant" && item.variantIds.some((v) => p.targetVariantIds.includes(v)));
      if (!hit) continue;
      out[item.id] = [...(out[item.id] ?? []), badge].slice(0, 2);
    }
  }
  return out;
}

/* ------------------------------- Analytics -------------------------------- */

export type MarketingAnalytics = {
  totalRedemptions: number;
  totalDiscountGiven: number;
  averageDiscount: number;
  revenueWithPromotions: number;
  ordersWithPromotions: number;
  ordersTotal: number;
  conversionRate: number;
  averageOrderValueWithPromo: number;
  averageOrderValueWithoutPromo: number;
  perPromotion: Array<{
    promotionId: string;
    name: string;
    redemptions: number;
    discountGiven: number;
    revenue: number;
  }>;
  unusedPromotions: Array<{ promotionId: string; name: string }>;
};

export async function loadMarketingAnalytics(
  supabase: CloudClient,
  promotions: Promotion[],
): Promise<MarketingAnalytics> {
  const [redRes, ordersRes] = await Promise.all([
    supabase
      .from("promotion_redemptions")
      .select("promotion_id,order_id,discount_amount")
      .limit(5000),
    supabase.from("orders").select("id,total,status").limit(5000),
  ]);
  if (redRes.error) throw new Error(redRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  const redemptions = redRes.data ?? [];
  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled");
  const orderTotals = new Map(orders.map((o) => [o.id, Number(o.total)]));

  const promoOrderIds = new Set(
    redemptions.map((r) => r.order_id).filter((v): v is string => Boolean(v)),
  );
  const revenueWithPromotions = Array.from(promoOrderIds).reduce(
    (s, id) => s + (orderTotals.get(id) ?? 0),
    0,
  );
  const totalDiscount = redemptions.reduce((s, r) => s + Number(r.discount_amount), 0);
  const withoutPromoOrders = orders.filter((o) => !promoOrderIds.has(o.id));
  const revenueWithout = withoutPromoOrders.reduce((s, o) => s + Number(o.total), 0);

  const perPromotion = promotions.map((p) => {
    const mine = redemptions.filter((r) => r.promotion_id === p.id);
    const orderIds = new Set(mine.map((r) => r.order_id).filter((v): v is string => Boolean(v)));
    return {
      promotionId: p.id,
      name: p.name,
      redemptions: mine.length,
      discountGiven: round2(mine.reduce((s, r) => s + Number(r.discount_amount), 0)),
      revenue: round2(Array.from(orderIds).reduce((s, id) => s + (orderTotals.get(id) ?? 0), 0)),
    };
  });

  return {
    totalRedemptions: redemptions.length,
    totalDiscountGiven: round2(totalDiscount),
    averageDiscount: redemptions.length ? round2(totalDiscount / redemptions.length) : 0,
    revenueWithPromotions: round2(revenueWithPromotions),
    ordersWithPromotions: promoOrderIds.size,
    ordersTotal: orders.length,
    conversionRate: orders.length ? Math.round((promoOrderIds.size / orders.length) * 100) : 0,
    averageOrderValueWithPromo: promoOrderIds.size
      ? round2(revenueWithPromotions / promoOrderIds.size)
      : 0,
    averageOrderValueWithoutPromo: withoutPromoOrders.length
      ? round2(revenueWithout / withoutPromoOrders.length)
      : 0,
    perPromotion: perPromotion.sort((a, b) => b.revenue - a.revenue),
    unusedPromotions: perPromotion
      .filter((p) => p.redemptions === 0)
      .map((p) => ({ promotionId: p.promotionId, name: p.name })),
  };
}

/**
 * Marketing Engine — shared types and pure helpers.
 * Client-safe: no server imports. The discount engine itself lives in
 * marketing.server.ts and is only ever reachable through server functions.
 */

export type PromoType =
  | "percent"
  | "fixed"
  | "buy_x_get_y"
  | "free_item"
  | "free_delivery"
  | "bundle"
  | "order_value";

export type PromoScope = "store" | "category" | "product" | "variant";
export type PromoStackMode = "stackable" | "exclusive";
export type PromotionItemRole = "bundle" | "buy" | "get";

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  percent: "Percentage discount",
  fixed: "Fixed amount discount",
  buy_x_get_y: "Buy X get Y",
  free_item: "Free item",
  free_delivery: "Free delivery",
  bundle: "Bundle / deal price",
  order_value: "Spend & get reward",
};

/** Owner-selectable campaign/season presets — free text is also allowed. */
export const CAMPAIGN_PRESETS = [
  "Ramadan",
  "Eid",
  "Independence Day",
  "New Year",
  "Winter",
  "Summer",
  "Back To School",
  "Cricket Match Day",
  "Restaurant Anniversary",
  "Flash Sale",
  "Happy Hour",
  "Lunch Special",
  "Dinner Special",
  "Weekend Deal",
  "Student Offer",
  "Family Deal",
  "Owner Recommended",
] as const;

export type PromotionItem = {
  id: string;
  menuItemId: string;
  quantity: number;
  role: PromotionItemRole;
};

export type Promotion = {
  id: string;
  name: string;
  slug: string;
  promoType: PromoType;
  headline: string;
  description: string;
  imageKey: string;
  badgeLabel: string;
  targetScope: PromoScope;
  targetCategoryIds: string[];
  targetMenuItemIds: string[];
  targetVariantIds: string[];
  discountValue: number;
  minOrderAmount: number;
  buyQuantity: number;
  getQuantity: number;
  getMenuItemId: string | null;
  getDiscountPercent: number;
  bundlePrice: number | null;
  freeDelivery: boolean;
  startsAt: string | null;
  endsAt: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[];
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  stockLimit: number | null;
  campaign: string;
  season: string;
  priority: number;
  stackMode: PromoStackMode;
  applicableCustomerIds: string[];
  active: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  items: PromotionItem[];
};

/** Customer-facing promotion applied to a cart or order. */
export type AppliedPromotion = {
  promotionId: string;
  name: string;
  label: string;
  discount: number;
  freeItems: Array<{ name: string; quantity: number }>;
  freeDelivery: boolean;
};

/** "Only $220 more → unlock a FREE drink" style nudge shown inside the cart. */
export type PromoSuggestion = {
  promotionId: string;
  name: string;
  message: string;
  /** Suggested product to add to reach the promotion, when there is one. */
  addMenuItemId: string | null;
  /** Money the customer would save/gain, when computable. */
  saving: number;
};

export type CartQuote = {
  subtotal: number;
  promoDiscount: number;
  delivery: number;
  freeDelivery: boolean;
  total: number;
  applied: AppliedPromotion[];
  suggestions: PromoSuggestion[];
};

/** Compact promotion info rendered on menu cards and the product popup. */
export type PromotionBadge = {
  promotionId: string;
  slug: string;
  label: string;
  /** Present when the offer ends at a fixed time, so cards can count down. */
  endsAt: string | null;
  freeItemName: string | null;
  remainingStock: number | null;
};

export type StorefrontMarketing = {
  promotions: Promotion[];
  /** menuItemId -> badges for that product. */
  badges: Record<string, PromotionBadge[]>;
  /** Resolved names for referenced free/bundle products. */
  itemNames: Record<string, string>;
};

const HHMM = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};

/** True when the campaign's schedule and limits allow it to run at `now`. */
export function promotionRunning(p: Promotion, now: Date = new Date()): boolean {
  if (!p.active) return false;
  const ms = now.getTime();
  if (p.startsAt && new Date(p.startsAt).getTime() > ms) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() < ms) return false;
  if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (p.startTime && minutes < HHMM(p.startTime)) return false;
  if (p.endTime && minutes > HHMM(p.endTime)) return false;
  if (p.usageLimit !== null && p.usageCount >= p.usageLimit) return false;
  if (p.stockLimit !== null && p.usageCount >= p.stockLimit) return false;
  return true;
}

/** Remaining redemptions for "Only 10 deals left" messaging; null = unlimited. */
export function remainingStock(p: Promotion): number | null {
  const caps = [p.stockLimit, p.usageLimit].filter((v): v is number => v !== null);
  if (caps.length === 0) return null;
  return Math.max(0, Math.min(...caps) - p.usageCount);
}

function money(n: number) {
  return `$${Number(n).toFixed(Number.isInteger(n) ? 0 : 2)}`;
}

/** Short marketing label — owner's badge text wins, otherwise derived from the rule. */
export function promotionLabel(p: Promotion, itemNames: Record<string, string> = {}): string {
  if (p.badgeLabel.trim()) return p.badgeLabel.trim();
  const freeName = p.getMenuItemId ? itemNames[p.getMenuItemId] : undefined;
  switch (p.promoType) {
    case "percent":
      return `${p.discountValue}% OFF`;
    case "fixed":
      return `${money(p.discountValue)} OFF`;
    case "free_delivery":
      return "FREE DELIVERY";
    case "free_item":
      return `FREE ${freeName ?? "item"}`.toUpperCase();
    case "bundle":
      return p.bundlePrice !== null ? `DEAL ${money(p.bundlePrice)}` : "BUNDLE DEAL";
    case "buy_x_get_y":
      if (p.getDiscountPercent > 0) return `BUY ${p.buyQuantity} → ${p.getDiscountPercent}% OFF`;
      return `BUY ${p.buyQuantity} → FREE ${(freeName ?? "item").toUpperCase()}`;
    case "order_value":
      if (p.freeDelivery) return `SPEND ${money(p.minOrderAmount)} → FREE DELIVERY`;
      if (freeName) return `SPEND ${money(p.minOrderAmount)} → FREE ${freeName.toUpperCase()}`;
      return `SPEND ${money(p.minOrderAmount)} → ${p.discountValue}% OFF`;
  }
}

/** Human readable schedule, e.g. "Fri, Sat · 18:00–23:00 · until 12 Aug". */
export function scheduleLabel(p: Promotion): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parts: string[] = [];
  if (p.daysOfWeek.length > 0) {
    parts.push([...p.daysOfWeek].sort().map((d) => names[d]).join(", "));
  }
  if (p.startTime || p.endTime) {
    parts.push(`${(p.startTime ?? "00:00").slice(0, 5)}–${(p.endTime ?? "23:59").slice(0, 5)}`);
  }
  if (p.endsAt) {
    parts.push(
      `until ${new Date(p.endsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
    );
  }
  return parts.join(" · ");
}

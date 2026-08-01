import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Sparkles, Tag, Timer, Gift, TrendingUp, Plus } from "lucide-react";
import { getStorefrontMarketing, quoteCart } from "@/lib/marketing.functions";
import type { CartQuote, Promotion, PromotionBadge } from "@/lib/marketing.types";
import { promotionLabel, remainingStock, scheduleLabel } from "@/lib/marketing.types";
import type { CartEntry } from "@/lib/menu.types";

const money = (n: number) => `$${n.toFixed(2)}`;

/* --------------------------------- Hooks --------------------------------- */

export function useMarketing() {
  const fetchMarketing = useServerFn(getStorefrontMarketing);
  const { data } = useQuery({
    queryKey: ["storefront-marketing"],
    queryFn: () => fetchMarketing(),
    staleTime: 60_000,
  });
  return {
    promotions: data?.promotions ?? [],
    badges: data?.badges ?? ({} as Record<string, PromotionBadge[]>),
    itemNames: data?.itemNames ?? ({} as Record<string, string>),
  };
}

/** Server-computed cart pricing: discounts are never calculated in the browser. */
export function useCartQuote(cart: CartEntry[]) {
  const fetchQuote = useServerFn(quoteCart);
  const payload = useMemo(
    () =>
      cart.map((c) => ({
        menuItemId: c.menuItemId,
        variantId: c.variantId ?? undefined,
        addonIds: c.addonIds,
        quantity: c.quantity,
      })),
    [cart],
  );
  const { data } = useQuery<CartQuote>({
    queryKey: ["cart-quote", payload],
    queryFn: () => fetchQuote({ data: { items: payload } }),
    enabled: payload.length > 0,
    staleTime: 15_000,
  });
  return data ?? null;
}

/* -------------------------------- Countdown ------------------------------- */

function useTimeLeft(endsAt: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return setLeft(null);
    const tick = () => setLeft(new Date(endsAt).getTime() - Date.now());
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [endsAt]);
  return left;
}

export function PromoCountdown({ endsAt }: { endsAt: string | null }) {
  const left = useTimeLeft(endsAt);
  if (left === null || left <= 0) return null;
  const total = Math.floor(left / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const cells = d > 0 ? [[d, "Days"], [h, "Hrs"], [m, "Min"]] : [[h, "Hrs"], [m, "Min"], [s, "Sec"]];
  return (
    <div className="flex gap-2 font-mono text-xs uppercase">
      {cells.map(([v, l]) => (
        <div key={String(l)} className="bg-black/20 px-3 py-2 min-w-[48px] text-center">
          <div className="font-bold text-base">{String(v).padStart(2, "0")}</div>
          <div className="text-[8px] opacity-60">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Product badges ---------------------------- */

/** Campaign chips rendered on menu cards and inside the product popup. */
export function PromoBadges({
  menuItemId,
  badges,
  compact = false,
}: {
  menuItemId: string;
  badges: Record<string, PromotionBadge[]>;
  compact?: boolean;
}) {
  const list = badges[menuItemId] ?? [];
  if (list.length === 0) return null;
  return (
    <>
      {list.map((b) => (
        <span
          key={b.promotionId}
          className={`bg-brand-orange text-brand-black font-bold uppercase tracking-wider ${compact ? "px-2 py-0.5 text-[9px]" : "px-2 py-0.5 text-[9px]"}`}
          title={b.freeItemName ? `Includes free ${b.freeItemName}` : b.label}
        >
          {b.label}
          {b.remainingStock !== null && b.remainingStock <= 10 ? ` · ${b.remainingStock} left` : ""}
        </span>
      ))}
    </>
  );
}

/* ------------------------------ Offers section ---------------------------- */

const DEAL_SKINS = [
  "bg-brand-red text-white",
  "bg-brand-orange text-brand-black",
  "bg-brand-gold text-brand-black",
];

/** Live campaigns rendered in the existing "Smoking Hot Deals" layout. */
export function OffersSection({
  promotions,
  itemNames,
  onClaim,
}: {
  promotions: Promotion[];
  itemNames: Record<string, string>;
  onClaim: (p: Promotion) => void;
}) {
  const deals = promotions.filter((p) => p.featured).slice(0, 6);
  if (deals.length === 0) return null;

  return (
    <section id="offers" className="bg-brand-black text-white py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="font-mono text-brand-gold text-xs font-bold uppercase tracking-[0.3em] mb-3">
            — Limited Time
          </div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter">
            Smoking <span className="text-brand-orange">Hot Deals</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {deals.map((p, i) => {
            const left = remainingStock(p);
            const schedule = scheduleLabel(p);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -8, rotate: -1 }}
                className={`${DEAL_SKINS[i % DEAL_SKINS.length]} p-8 relative overflow-hidden group`}
              >
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70 mb-2 flex items-center gap-2">
                  <Tag className="size-3" /> {p.campaign || p.season || `Deal #${i + 1}`}
                </div>
                <h3 className="font-display text-4xl uppercase tracking-tighter mb-3">{p.name}</h3>
                <p className="text-sm opacity-80 mb-5">{p.headline || p.description}</p>

                <div className="flex items-baseline gap-3 mb-4 flex-wrap">
                  <span className="font-display text-4xl">{promotionLabel(p, itemNames)}</span>
                  {p.bundlePrice !== null && p.promoType === "bundle" && (
                    <span className="font-mono text-xs opacity-70">bundle price {money(p.bundlePrice)}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-5 font-mono text-[10px] uppercase tracking-widest">
                  {p.minOrderAmount > 0 && (
                    <span className="bg-black/20 px-2 py-1">Min {money(p.minOrderAmount)}</span>
                  )}
                  {schedule && (
                    <span className="bg-black/20 px-2 py-1 flex items-center gap-1">
                      <Timer className="size-3" /> {schedule}
                    </span>
                  )}
                  {left !== null && <span className="bg-black/20 px-2 py-1">Only {left} left</span>}
                </div>

                <PromoCountdown endsAt={p.endsAt} />

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => onClaim(p)}
                    className="flex-1 py-3 bg-brand-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-brand-black transition-colors"
                  >
                    Claim Offer
                  </button>
                  <Link
                    to="/deals/$slug"
                    params={{ slug: p.slug }}
                    className="px-4 py-3 border border-black/20 text-[10px] font-bold uppercase tracking-widest hover:bg-black/10 transition-colors grid place-items-center"
                  >
                    Details
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Cart promotion summary ------------------------ */

/** Applied campaigns + "spend a bit more" progress nudges inside the cart. */
export function CartPromotions({
  quote,
  onAddItem,
  itemNames,
}: {
  quote: CartQuote | null;
  onAddItem: (menuItemId: string) => void;
  itemNames: Record<string, string>;
}) {
  if (!quote) return null;
  const hasAny = quote.applied.length > 0 || quote.suggestions.length > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-4 border border-brand-orange/40 bg-brand-orange/10 p-3 space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red flex items-center gap-1">
        <Sparkles className="size-3" /> Deals applied
      </div>

      {quote.applied.map((a) => (
        <div key={a.promotionId} className="flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="font-bold truncate">{a.name}</div>
            <div className="font-mono text-[10px] uppercase text-brand-black/55">{a.label}</div>
            {a.freeItems.map((f) => (
              <div key={f.name} className="text-[10px] text-brand-black/60 flex items-center gap-1">
                <Gift className="size-3" /> {f.quantity} × {f.name} free
              </div>
            ))}
          </div>
          <div className="font-mono font-bold text-brand-red whitespace-nowrap">
            {a.freeDelivery && a.discount === 0 ? "Free delivery" : `-${money(a.discount)}`}
          </div>
        </div>
      ))}

      {quote.suggestions.map((s) => (
        <div key={s.promotionId} className="border-t border-brand-orange/30 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] flex items-start gap-1.5">
              <TrendingUp className="size-3 mt-0.5 text-brand-red flex-shrink-0" />
              <span>{s.message}</span>
            </div>
            {s.addMenuItemId && (
              <button
                onClick={() => onAddItem(s.addMenuItemId!)}
                className="flex-shrink-0 px-2 py-1 bg-brand-black text-white font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-brand-red transition-colors flex items-center gap-1"
              >
                <Plus className="size-3" /> {itemNames[s.addMenuItemId]?.split(" ")[0] ?? "Add"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

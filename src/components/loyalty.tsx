import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Gift, Heart, History, Loader2, RotateCcw, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyLoyalty, toggleFavorite } from "@/lib/loyalty.functions";
import type { CustomerLoyaltySnapshot, CustomerOrderSummary } from "@/lib/loyalty.types";

/** True once any Supabase session (including the anonymous checkout one) exists. */
export function useHasSession() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setReady(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setReady(Boolean(session));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return ready;
}

export function useLoyalty() {
  const hasSession = useHasSession();
  const fetchLoyalty = useServerFn(getMyLoyalty);
  return useQuery<CustomerLoyaltySnapshot>({
    queryKey: ["my-loyalty"],
    queryFn: () => fetchLoyalty(),
    enabled: hasSession,
    staleTime: 30_000,
  });
}

export function useFavorites() {
  const { data } = useLoyalty();
  const qc = useQueryClient();
  const toggle = useServerFn(toggleFavorite);
  const favorites = useMemo(() => new Set(data?.favorites ?? []), [data?.favorites]);

  const setFavorite = async (menuItemId: string, favorite: boolean) => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) await supabase.auth.signInAnonymously();
      await toggle({ data: { menuItemId, favorite } });
      await qc.invalidateQueries({ queryKey: ["my-loyalty"] });
    } catch (err) {
      console.warn("[loyalty] favourite toggle failed", err);
    }
  };

  return { favorites, setFavorite };
}

export function FavoriteButton({ menuItemId, name }: { menuItemId: string; name: string }) {
  const { favorites, setFavorite } = useFavorites();
  const active = favorites.has(menuItemId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void setFavorite(menuItemId, !active);
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      className="size-9 grid place-items-center bg-white/90 backdrop-blur border border-brand-black/10 hover:bg-white transition-colors"
    >
      <Heart className={`size-4 ${active ? "fill-brand-red text-brand-red" : "text-brand-black/50"}`} />
    </button>
  );
}

/* ------------------------------- Cart progress ------------------------------ */

export function CartLoyalty({
  rewardId,
  onSelectReward,
}: {
  rewardId: string | null;
  onSelectReward: (id: string | null) => void;
}) {
  const { data, isLoading } = useLoyalty();
  const progress = data?.progress ?? [];
  const available = (data?.rewards ?? []).filter(
    (r) => r.status === "unlocked" && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()),
  );

  if (isLoading || (progress.length === 0 && available.length === 0)) return null;

  return (
    <div className="mt-4 pt-4 border-t border-brand-black/10 space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red flex items-center gap-2">
        <Trophy className="size-3" /> Loyalty
      </div>

      {progress.map((p) => (
        <div key={p.programId} className="bg-brand-cream p-3">
          <div className="flex justify-between text-xs font-bold">
            <span>{p.name}</span>
            <span className="font-mono">
              {p.unit === "amount" ? `Rs. ${Math.round(p.current)}` : Math.round(p.current)} /{" "}
              {p.unit === "amount" ? `Rs. ${Math.round(p.threshold)}` : Math.round(p.threshold)}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-brand-black/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${p.percent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-brand-orange"
            />
          </div>
          <p className="mt-2 text-[11px] text-brand-black/60">{p.message}</p>
        </div>
      ))}

      {available.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-black/50">
            Apply a reward
          </div>
          {available.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectReward(rewardId === r.id ? null : r.id)}
              aria-pressed={rewardId === r.id}
              className={`w-full text-left px-3 py-3 border text-xs flex items-center gap-2 transition-colors ${
                rewardId === r.id
                  ? "border-brand-red bg-brand-red/5 text-brand-red font-bold"
                  : "border-brand-black/10 hover:border-brand-black/30"
              }`}
            >
              <Gift className="size-4 shrink-0" />
              <span className="flex-1">
                {r.rewardLabel}
                <span className="block font-mono text-[10px] uppercase tracking-widest text-brand-black/40">
                  {r.programName}
                  {r.expiresAt ? ` · expires ${new Date(r.expiresAt).toLocaleDateString()}` : ""}
                </span>
              </span>
              {rewardId === r.id && <span className="font-mono text-[10px]">APPLIED</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Repeat-order section --------------------------- */

export function LoyaltySection({
  onReorder,
  onReorderItem,
}: {
  onReorder: (order: CustomerOrderSummary) => void;
  onReorderItem: (item: CustomerOrderSummary["items"][number]) => void;
}) {
  const { data, isLoading } = useLoyalty();
  const hasSession = useHasSession();

  if (!hasSession) return null;
  if (isLoading) {
    return (
      <section className="py-16 flex justify-center">
        <Loader2 className="size-5 animate-spin text-brand-black/30" />
      </section>
    );
  }

  const orders = data?.orders ?? [];
  const rewards = (data?.rewards ?? []).filter((r) => r.status === "unlocked");
  const progress = data?.progress ?? [];
  const mostOrdered = data?.mostOrdered ?? [];
  if (orders.length === 0 && rewards.length === 0 && progress.length === 0) return null;

  const lastOrder = orders[0];

  return (
    <section id="loyalty" className="py-20 md:py-28 bg-brand-black text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-brand-gold">
          Rewards & Reorder
        </div>
        <h2 className="mt-3 font-display text-4xl md:text-6xl uppercase tracking-tighter">
          Your <span className="text-brand-orange">Loyalty</span>
        </h2>

        {progress.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progress.map((p) => (
              <div key={p.programId} className="border border-white/10 p-5 bg-white/5">
                <div className="font-display text-xl uppercase tracking-tighter">{p.name}</div>
                {p.description && (
                  <p className="mt-1 text-xs text-white/50">{p.description}</p>
                )}
                <div className="mt-4 h-2 bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${p.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="h-full bg-brand-gold"
                  />
                </div>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-brand-gold">
                  {p.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {rewards.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-3">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-4 py-3 bg-brand-gold text-brand-black font-bold text-xs uppercase tracking-tighter"
              >
                <Gift className="size-4" /> {r.rewardLabel} unlocked
              </div>
            ))}
          </div>
        )}

        {lastOrder && (
          <div className="mt-12 border border-white/10 p-5 bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Order again?
                </div>
                <div className="mt-1 font-bold text-sm">
                  {lastOrder.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onReorder(lastOrder)}
                className="px-6 py-3 bg-brand-orange text-brand-black font-bold uppercase text-xs tracking-tighter flex items-center gap-2 hover:bg-brand-gold transition-colors"
              >
                <RotateCcw className="size-4" /> Repeat this order
              </button>
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <History className="size-3" /> Recent orders
            </div>
            <div className="mt-4 space-y-3">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-white/50 font-mono">
                      {new Date(o.createdAt).toLocaleString()} · {o.status}
                    </div>
                    <button
                      type="button"
                      onClick={() => onReorder(o)}
                      className="text-xs font-bold uppercase tracking-tighter text-brand-gold hover:text-white"
                    >
                      Order again
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.items.map((i, idx) => (
                      <button
                        key={`${o.id}-${idx}`}
                        type="button"
                        onClick={() => onReorderItem(i)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/15 text-[11px] transition-colors"
                        aria-label={`Add ${i.name} to cart again`}
                      >
                        {i.quantity}× {i.name}
                        {i.variantName ? ` (${i.variantName})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mostOrdered.length > 0 && (
          <div className="mt-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              Most ordered by you
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mostOrdered.map((m) => (
                <span
                  key={m.menuItemId}
                  className="px-3 py-2 border border-white/10 text-[11px] font-mono uppercase tracking-widest"
                >
                  {m.name} · {m.quantity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

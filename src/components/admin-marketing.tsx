import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2, Megaphone, Plus, Save, Trash2, X, Zap } from "lucide-react";
import {
  deletePromotion,
  getMarketingAdmin,
  previewPromotion,
  upsertPromotion,
} from "@/lib/marketing.functions";
import type { Promotion, PromoType } from "@/lib/marketing.types";
import { CAMPAIGN_PRESETS, PROMO_TYPE_LABELS, promotionLabel, scheduleLabel } from "@/lib/marketing.types";
import type { AdminCategory, AdminMenuItem, AdminVariant } from "@/lib/admin.types";

type Payload = Awaited<ReturnType<typeof getMarketingAdmin>>;
type Draft = Promotion;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EMPTY: Draft = {
  id: "",
  name: "",
  slug: "",
  promoType: "percent",
  headline: "",
  description: "",
  imageKey: "",
  badgeLabel: "",
  targetScope: "store",
  targetCategoryIds: [],
  targetMenuItemIds: [],
  targetVariantIds: [],
  discountValue: 10,
  minOrderAmount: 0,
  buyQuantity: 0,
  getQuantity: 0,
  getMenuItemId: null,
  getDiscountPercent: 0,
  bundlePrice: null,
  freeDelivery: false,
  startsAt: null,
  endsAt: null,
  startTime: null,
  endTime: null,
  daysOfWeek: [],
  usageLimit: null,
  usageCount: 0,
  perCustomerLimit: null,
  stockLimit: null,
  campaign: "",
  season: "",
  priority: 100,
  stackMode: "stackable",
  applicableCustomerIds: [],
  active: true,
  featured: true,
  seoTitle: "",
  seoDescription: "",
  items: [],
};

const inputCls =
  "w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-widest text-brand-black/50">
      {label}
      <div className="mt-2 normal-case">{children}</div>
      {hint && <span className="mt-1 block text-[10px] normal-case tracking-normal text-brand-black/40">{hint}</span>}
    </label>
  );
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function toLocalInput(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MarketingTab({
  menuItems,
  categories,
  variants,
  setMessage,
}: {
  menuItems: AdminMenuItem[];
  categories: AdminCategory[];
  variants: AdminVariant[];
  setMessage: (m: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const load = useServerFn(getMarketingAdmin);
  const save = useServerFn(upsertPromotion);
  const remove = useServerFn(deletePromotion);
  const preview = useServerFn(previewPromotion);

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d as Payload))
      .catch((e) => setMessage({ kind: "err", text: (e as Error).message }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load, setMessage]);

  const itemNames = useMemo(
    () => Object.fromEntries(menuItems.map((i) => [i.id, i.name])),
    [menuItems],
  );

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return setMessage({ kind: "err", text: "Campaign name is required." });
    setSaving(true);
    try {
      const result = (await save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name.trim(),
          slug: draft.slug.trim() || slugify(draft.name),
          promoType: draft.promoType,
          headline: draft.headline,
          description: draft.description,
          imageKey: draft.imageKey,
          badgeLabel: draft.badgeLabel,
          targetScope: draft.targetScope,
          targetCategoryIds: draft.targetCategoryIds,
          targetMenuItemIds: draft.targetMenuItemIds,
          targetVariantIds: draft.targetVariantIds,
          discountValue: draft.discountValue,
          minOrderAmount: draft.minOrderAmount,
          buyQuantity: draft.buyQuantity,
          getQuantity: draft.getQuantity,
          getMenuItemId: draft.getMenuItemId,
          getDiscountPercent: draft.getDiscountPercent,
          bundlePrice: draft.bundlePrice,
          freeDelivery: draft.freeDelivery,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          startTime: draft.startTime,
          endTime: draft.endTime,
          daysOfWeek: draft.daysOfWeek,
          usageLimit: draft.usageLimit,
          perCustomerLimit: draft.perCustomerLimit,
          stockLimit: draft.stockLimit,
          campaign: draft.campaign,
          season: draft.season,
          priority: draft.priority,
          stackMode: draft.stackMode,
          applicableCustomerIds: draft.applicableCustomerIds,
          active: draft.active,
          featured: draft.featured,
          seoTitle: draft.seoTitle,
          seoDescription: draft.seoDescription,
          items: draft.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            role: i.role,
          })),
        },
      })) as Payload;
      setData(result);
      setDraft(null);
      setMessage({ kind: "ok", text: "Campaign saved — live on the site instantly." });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (id: string) => {
    setSaving(true);
    try {
      const result = (await remove({ data: { id } })) as Payload;
      setData(result);
      setMessage({ kind: "ok", text: "Campaign deleted." });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async (p: Promotion) => {
    setPreviewResult(null);
    // Build a sample cart out of the campaign's own products, or the first 2 menu items.
    const sample =
      p.items.length > 0
        ? p.items.map((i) => ({ menuItemId: i.menuItemId, quantity: Math.max(1, i.quantity) }))
        : (p.targetMenuItemIds.length > 0
            ? p.targetMenuItemIds.slice(0, 2)
            : menuItems.slice(0, 2).map((m) => m.id)
          ).map((id) => ({ menuItemId: id, quantity: Math.max(2, p.buyQuantity || 2) }));
    if (sample.length === 0) return setPreviewResult("Add products to the menu first.");
    try {
      const res = await preview({ data: { promotionId: p.id, items: sample } });
      const q = res.quote;
      setPreviewResult(
        `${res.running ? "Running now" : "Not running right now (schedule/limits)"} · sample subtotal $${q.subtotal.toFixed(2)} → discount $${q.promoDiscount.toFixed(2)}${q.freeDelivery ? " + free delivery" : ""}${q.applied[0]?.freeItems.length ? ` + free ${q.applied[0].freeItems.map((f) => f.name).join(", ")}` : ""}`,
      );
    } catch (e) {
      setPreviewResult((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 grid place-items-center text-white/60">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const a = data?.analytics;
  const promotions = data?.promotions ?? [];
  const variantsForSelected = variants.filter((v) => draft?.targetMenuItemIds.includes(v.menuItemId));

  return (
    <div className="space-y-8">
      {/* Analytics */}
      {a && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Campaign redemptions", value: String(a.totalRedemptions) },
            { label: "Discount given", value: `$${a.totalDiscountGiven.toFixed(2)}` },
            { label: "Revenue with deals", value: `$${a.revenueWithPromotions.toFixed(2)}` },
            { label: "Orders using a deal", value: `${a.conversionRate}%` },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.label}</div>
              <div className="font-display text-3xl tracking-tighter text-white mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {a && (
        <div className="bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50 mb-3">
            <BarChart3 className="size-3" /> Performance by campaign
          </div>
          <div className="text-xs text-white/70 space-y-1">
            <div className="flex justify-between">
              <span>Avg order value with a deal</span>
              <span className="font-mono">${a.averageOrderValueWithPromo.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg order value without a deal</span>
              <span className="font-mono">${a.averageOrderValueWithoutPromo.toFixed(2)}</span>
            </div>
          </div>
          {a.perPromotion.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs text-white/70">
                <thead className="text-white/40 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="text-left py-1">Campaign</th>
                    <th className="text-right py-1">Uses</th>
                    <th className="text-right py-1">Discount</th>
                    <th className="text-right py-1">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {a.perPromotion.map((row) => (
                    <tr key={row.promotionId} className="border-t border-white/10">
                      <td className="py-1.5 pr-2">{row.name}</td>
                      <td className="py-1.5 text-right font-mono">{row.redemptions}</td>
                      <td className="py-1.5 text-right font-mono">${row.discountGiven.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono">${row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Campaign list */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl uppercase tracking-tighter text-white flex items-center gap-2">
          <Megaphone className="size-5 text-brand-orange" /> Campaigns
        </h3>
        <button
          onClick={() => {
            setDraft({ ...EMPTY });
            setPreviewResult(null);
          }}
          className="px-4 py-2 bg-brand-red text-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-brand-black transition-colors flex items-center gap-1"
        >
          <Plus className="size-3" /> New campaign
        </button>
      </div>

      <div className="grid gap-3">
        {promotions.length === 0 && (
          <div className="border border-dashed border-white/15 p-8 text-center text-white/50 text-sm">
            No campaigns yet. Create your first deal — it appears in “Smoking Hot Deals” instantly.
          </div>
        )}
        {promotions.map((p) => (
          <div key={p.id} className="bg-white/5 border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xl uppercase tracking-tighter text-white">{p.name}</span>
                  <span className="px-2 py-0.5 bg-brand-orange text-brand-black font-mono text-[9px] font-bold uppercase">
                    {promotionLabel(p, itemNames)}
                  </span>
                  {!p.active && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/60 font-mono text-[9px] uppercase">Paused</span>
                  )}
                  {p.stackMode === "exclusive" && (
                    <span className="px-2 py-0.5 bg-brand-red text-white font-mono text-[9px] uppercase">No stacking</span>
                  )}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-1">
                  {PROMO_TYPE_LABELS[p.promoType]} · {p.targetScope} · priority {p.priority}
                  {scheduleLabel(p) ? ` · ${scheduleLabel(p)}` : ""} · used {p.usageCount}×
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => runPreview(p)}
                  className="px-3 py-2 border border-white/20 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 flex items-center gap-1"
                >
                  <Zap className="size-3" /> Test
                </button>
                <button
                  onClick={() => {
                    setDraft({ ...p });
                    setPreviewResult(null);
                  }}
                  className="px-3 py-2 bg-white text-brand-black font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gold"
                >
                  Edit
                </button>
                <button
                  onClick={() => destroy(p.id)}
                  disabled={saving}
                  aria-label={`Delete ${p.name}`}
                  className="px-3 py-2 border border-white/20 text-white/70 hover:text-brand-red hover:border-brand-red"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewResult && (
        <div className="bg-brand-orange/15 border border-brand-orange/40 p-3 font-mono text-[11px] text-white">
          {previewResult}
        </div>
      )}

      {/* Editor */}
      {draft && (
        <div className="bg-white text-brand-black p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-2xl uppercase tracking-tighter">
              {draft.id ? "Edit campaign" : "New campaign"}
            </h4>
            <button onClick={() => setDraft(null)} aria-label="Close editor" className="size-8 grid place-items-center bg-brand-black text-white hover:bg-brand-red">
              <X className="size-4" />
            </button>
          </div>

          {/* Basics */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Campaign name">
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) =>
                  patch({
                    name: e.target.value,
                    slug: draft.id ? draft.slug : slugify(e.target.value),
                  })
                }
                placeholder="Ramadan Family Feast"
              />
            </Field>
            <Field label="Page link (slug)" hint="Campaign page: /deals/your-slug">
              <input className={inputCls} value={draft.slug} onChange={(e) => patch({ slug: slugify(e.target.value) })} />
            </Field>
            <Field label="Promotion type">
              <select
                className={inputCls}
                value={draft.promoType}
                onChange={(e) => patch({ promoType: e.target.value as PromoType })}
              >
                {(Object.keys(PROMO_TYPE_LABELS) as PromoType[]).map((t) => (
                  <option key={t} value={t}>
                    {PROMO_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Badge text" hint="Shown on product cards. Leave blank for an automatic label.">
              <input className={inputCls} value={draft.badgeLabel} onChange={(e) => patch({ badgeLabel: e.target.value })} placeholder="20% OFF" />
            </Field>
            <Field label="Headline">
              <input className={inputCls} value={draft.headline} onChange={(e) => patch({ headline: e.target.value })} placeholder="4 Zingers · 2 Fries · 1.5L Drink" />
            </Field>
            <Field label="Campaign / season tag">
              <input
                className={inputCls}
                list="campaign-presets"
                value={draft.campaign}
                onChange={(e) => patch({ campaign: e.target.value })}
                placeholder="Ramadan"
              />
              <datalist id="campaign-presets">
                {CAMPAIGN_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Description">
            <textarea className={inputCls} rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
          </Field>

          {/* Rule */}
          <div className="border-t border-brand-black/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red mb-3">Discount rule</div>
            <div className="grid md:grid-cols-3 gap-4">
              {(draft.promoType === "percent" || draft.promoType === "fixed" || draft.promoType === "order_value") && (
                <Field label={draft.promoType === "fixed" ? "Discount amount ($)" : "Discount percent (%)"}>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.discountValue}
                    onChange={(e) => patch({ discountValue: Number(e.target.value) })}
                  />
                </Field>
              )}
              <Field
                label="Minimum order ($)"
                hint={draft.promoType === "order_value" ? "Spend threshold that unlocks the reward" : "0 = no minimum"}
              >
                <input
                  type="number"
                  className={inputCls}
                  value={draft.minOrderAmount}
                  onChange={(e) => patch({ minOrderAmount: Number(e.target.value) })}
                />
              </Field>
              {draft.promoType === "buy_x_get_y" && (
                <>
                  <Field label="Buy quantity (X)">
                    <input type="number" className={inputCls} value={draft.buyQuantity} onChange={(e) => patch({ buyQuantity: Number(e.target.value) })} />
                  </Field>
                  <Field label="Get quantity (Y)">
                    <input type="number" className={inputCls} value={draft.getQuantity} onChange={(e) => patch({ getQuantity: Number(e.target.value) })} />
                  </Field>
                  <Field label="Or discount the Y items (%)" hint="Leave 0 to give them free">
                    <input type="number" className={inputCls} value={draft.getDiscountPercent} onChange={(e) => patch({ getDiscountPercent: Number(e.target.value) })} />
                  </Field>
                </>
              )}
              {(draft.promoType === "free_item" ||
                draft.promoType === "buy_x_get_y" ||
                draft.promoType === "order_value") && (
                <Field label="Free product">
                  <select
                    className={inputCls}
                    value={draft.getMenuItemId ?? ""}
                    onChange={(e) => patch({ getMenuItemId: e.target.value || null })}
                  >
                    <option value="">— none —</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {draft.promoType === "bundle" && (
                <Field label="Bundle price ($)">
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.bundlePrice ?? 0}
                    onChange={(e) => patch({ bundlePrice: Number(e.target.value) })}
                  />
                </Field>
              )}
              {(draft.promoType === "free_delivery" || draft.promoType === "order_value") && (
                <Field label="Free delivery">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.freeDelivery} onChange={(e) => patch({ freeDelivery: e.target.checked })} />
                    Waive delivery charges
                  </label>
                </Field>
              )}
            </div>
          </div>

          {/* Bundle / buy-get composition */}
          {(draft.promoType === "bundle" || draft.promoType === "buy_x_get_y") && (
            <div className="border-t border-brand-black/10 pt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red mb-3">
                {draft.promoType === "bundle" ? "Bundle products" : "Products that count toward X"}
              </div>
              <div className="space-y-2">
                {draft.items.map((it, idx) => (
                  <div key={`${it.menuItemId}-${idx}`} className="flex gap-2 items-center">
                    <select
                      className={inputCls}
                      value={it.menuItemId}
                      onChange={(e) => {
                        const next = [...draft.items];
                        next[idx] = { ...it, menuItemId: e.target.value };
                        patch({ items: next });
                      }}
                    >
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="w-20 border border-brand-black/10 p-3 text-sm"
                      value={it.quantity}
                      onChange={(e) => {
                        const next = [...draft.items];
                        next[idx] = { ...it, quantity: Math.max(1, Number(e.target.value)) };
                        patch({ items: next });
                      }}
                    />
                    <button
                      onClick={() => patch({ items: draft.items.filter((_, i) => i !== idx) })}
                      aria-label="Remove product"
                      className="size-11 grid place-items-center border border-brand-black/10 hover:border-brand-red hover:text-brand-red"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    menuItems[0] &&
                    patch({
                      items: [
                        ...draft.items,
                        {
                          id: `new-${draft.items.length}`,
                          menuItemId: menuItems[0].id,
                          quantity: 1,
                          role: draft.promoType === "bundle" ? "bundle" : "buy",
                        },
                      ],
                    })
                  }
                  className="px-4 py-2 bg-brand-black text-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add product
                </button>
              </div>
            </div>
          )}

          {/* Targeting */}
          <div className="border-t border-brand-black/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red mb-3">Applies to</div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Target">
                <select
                  className={inputCls}
                  value={draft.targetScope}
                  onChange={(e) => patch({ targetScope: e.target.value as Draft["targetScope"] })}
                >
                  <option value="store">Whole store</option>
                  <option value="category">Specific categories</option>
                  <option value="product">Specific products</option>
                  <option value="variant">Specific variants</option>
                </select>
              </Field>
              {draft.targetScope === "category" && (
                <Field label="Categories">
                  <div className="max-h-40 overflow-y-auto border border-brand-black/10 p-2 space-y-1">
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.targetCategoryIds.includes(c.id)}
                          onChange={(e) =>
                            patch({
                              targetCategoryIds: e.target.checked
                                ? [...draft.targetCategoryIds, c.id]
                                : draft.targetCategoryIds.filter((x) => x !== c.id),
                            })
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </Field>
              )}
              {(draft.targetScope === "product" || draft.targetScope === "variant") && (
                <Field label="Products">
                  <div className="max-h-40 overflow-y-auto border border-brand-black/10 p-2 space-y-1">
                    {menuItems.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.targetMenuItemIds.includes(m.id)}
                          onChange={(e) =>
                            patch({
                              targetMenuItemIds: e.target.checked
                                ? [...draft.targetMenuItemIds, m.id]
                                : draft.targetMenuItemIds.filter((x) => x !== m.id),
                            })
                          }
                        />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </Field>
              )}
              {draft.targetScope === "variant" && (
                <Field label="Variants" hint="Pick products above first">
                  <div className="max-h-40 overflow-y-auto border border-brand-black/10 p-2 space-y-1">
                    {variantsForSelected.length === 0 && (
                      <div className="text-xs text-brand-black/40">No variants for the selected products.</div>
                    )}
                    {variantsForSelected.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.targetVariantIds.includes(v.id)}
                          onChange={(e) =>
                            patch({
                              targetVariantIds: e.target.checked
                                ? [...draft.targetVariantIds, v.id]
                                : draft.targetVariantIds.filter((x) => x !== v.id),
                            })
                          }
                        />
                        {itemNames[v.menuItemId]} — {v.name}
                      </label>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="border-t border-brand-black/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-red mb-3">Schedule</div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Starts">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(draft.startsAt)}
                  onChange={(e) => patch({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <Field label="Ends" hint="Drives the countdown on the deal card">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(draft.endsAt)}
                  onChange={(e) => patch({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <Field label="Daily from (happy hour)">
                <input type="time" className={inputCls} value={draft.startTime ?? ""} onChange={(e) => patch({ startTime: e.target.value || null })} />
              </Field>
              <Field label="Daily until">
                <input type="time" className={inputCls} value={draft.endTime ?? ""} onChange={(e) => patch({ endTime: e.target.value || null })} />
              </Field>
            </div>
            <div className="mt-4">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-black/50 mb-2">Days of week</div>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, idx) => {
                  const on = draft.daysOfWeek.includes(idx);
                  return (
                    <button
                      key={d}
                      onClick={() =>
                        patch({
                          daysOfWeek: on
                            ? draft.daysOfWeek.filter((x) => x !== idx)
                            : [...draft.daysOfWeek, idx],
                        })
                      }
                      className={`px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest border ${on ? "bg-brand-red text-white border-brand-red" : "border-brand-black/15 text-brand-black/60"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-brand-black/40 mt-2">No days selected = runs every day.</p>
            </div>
          </div>

          {/* Limits, priority, visibility */}
          <div className="border-t border-brand-black/10 pt-4 grid md:grid-cols-3 gap-4">
            <Field label="Total uses limit" hint="Blank = unlimited">
              <input
                type="number"
                className={inputCls}
                value={draft.usageLimit ?? ""}
                onChange={(e) => patch({ usageLimit: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Uses per customer">
              <input
                type="number"
                className={inputCls}
                value={draft.perCustomerLimit ?? ""}
                onChange={(e) => patch({ perCustomerLimit: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Limited stock" hint='Shows "Only N left"'>
              <input
                type="number"
                className={inputCls}
                value={draft.stockLimit ?? ""}
                onChange={(e) => patch({ stockLimit: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Priority" hint="Lower number runs first">
              <input type="number" className={inputCls} value={draft.priority} onChange={(e) => patch({ priority: Number(e.target.value) })} />
            </Field>
            <Field label="Stacking">
              <select
                className={inputCls}
                value={draft.stackMode}
                onChange={(e) => patch({ stackMode: e.target.value as Draft["stackMode"] })}
              >
                <option value="stackable">Can combine with other deals</option>
                <option value="exclusive">Cannot be combined</option>
              </select>
            </Field>
            <Field label="Visibility">
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} /> Active
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.featured} onChange={(e) => patch({ featured: e.target.checked })} /> Show in “Hot Deals”
                </label>
              </div>
            </Field>
          </div>

          {/* SEO */}
          <div className="border-t border-brand-black/10 pt-4 grid md:grid-cols-2 gap-4">
            <Field label="SEO title" hint="Under 60 characters">
              <input className={inputCls} maxLength={120} value={draft.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
            </Field>
            <Field label="SEO description" hint="Under 160 characters">
              <input className={inputCls} maxLength={200} value={draft.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} />
            </Field>
          </div>

          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-3 bg-brand-red text-white font-bold uppercase text-xs tracking-tighter hover:bg-brand-black disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save campaign
            </button>
            <button onClick={() => setDraft(null)} className="px-6 py-3 border border-brand-black/15 font-bold uppercase text-xs tracking-tighter hover:bg-brand-black hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

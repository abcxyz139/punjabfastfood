import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import {
  deleteLoyaltyProgram,
  getLoyaltyAdmin,
  upsertLoyaltyProgram,
} from "@/lib/loyalty.functions";
import type { LoyaltyProgram } from "@/lib/loyalty.types";
import type { AdminCategory, AdminMenuItem } from "@/lib/admin.types";

type Payload = Awaited<ReturnType<typeof getLoyaltyAdmin>>;

const EMPTY: LoyaltyProgram = {
  id: "",
  name: "",
  description: "",
  earnType: "product",
  targetMenuItemId: null,
  targetCategoryId: null,
  threshold: 5,
  rewardType: "free_product",
  rewardValue: 0,
  rewardMenuItemId: null,
  rewardLabel: "",
  active: true,
  priority: 100,
  usageLimitPerCustomer: null,
  expiryMode: "never",
  expiryDays: null,
  expiresAt: null,
  stackMode: "stack_all",
  campaign: "",
  applicableCustomerIds: [],
};

const inputCls =
  "w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-widest text-brand-black/50">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function LoyaltyTab({
  menuItems,
  categories,
  setMessage,
}: {
  menuItems: AdminMenuItem[];
  categories: AdminCategory[];
  setMessage: (m: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const load = useServerFn(getLoyaltyAdmin);
  const save = useServerFn(upsertLoyaltyProgram);
  const remove = useServerFn(deleteLoyaltyProgram);

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LoyaltyProgram | null>(null);

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

  const submit = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const result = (await save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name,
          description: draft.description,
          earnType: draft.earnType,
          targetMenuItemId: draft.earnType === "product" ? draft.targetMenuItemId : null,
          targetCategoryId: draft.earnType === "category" ? draft.targetCategoryId : null,
          threshold: Number(draft.threshold),
          rewardType: draft.rewardType,
          rewardValue: Number(draft.rewardValue),
          rewardMenuItemId: draft.rewardType === "free_product" ? draft.rewardMenuItemId : null,
          rewardLabel: draft.rewardLabel,
          active: draft.active,
          priority: Number(draft.priority),
          usageLimitPerCustomer: draft.usageLimitPerCustomer,
          expiryMode: draft.expiryMode,
          expiryDays: draft.expiryMode === "days" ? draft.expiryDays : null,
          expiresAt: draft.expiryMode === "date" ? draft.expiresAt : null,
          stackMode: draft.stackMode,
          campaign: draft.campaign,
          applicableCustomerIds: draft.applicableCustomerIds,
        },
      })) as Payload;
      setData(result);
      setDraft(null);
      setMessage({ kind: "ok", text: "Loyalty program saved." });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (id: string) => {
    setSaving(true);
    try {
      setData((await remove({ data: { id } })) as Payload);
      setMessage({ kind: "ok", text: "Loyalty program deleted." });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="size-6 animate-spin text-white/40" />
      </div>
    );
  }

  const a = data?.analytics;

  return (
    <div className="space-y-6">
      {a && (
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Rewards issued", value: a.totalRewards },
            { label: "Redeemed", value: a.redeemedRewards },
            { label: "Unused", value: a.unusedRewards },
            { label: "Redemption rate", value: `${a.redemptionRate}%` },
            { label: "Repeat customers", value: a.repeatCustomers },
            { label: "Total customers", value: a.totalCustomers },
          ].map((s) => (
            <div key={s.label} className="bg-white text-brand-black p-4">
              <div className="font-display text-3xl uppercase tracking-tighter">{s.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-black/40">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="font-display text-3xl uppercase tracking-tighter text-white">
          Loyalty programs
        </h3>
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="px-5 py-3 bg-brand-red hover:bg-brand-orange hover:text-brand-black text-white font-bold uppercase text-xs tracking-tighter inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="size-4" /> New program
        </button>
      </div>

      {draft && (
        <div className="bg-white text-brand-black p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Buy 5 burgers, get 1 free"
              />
            </Field>
            <Field label="Campaign (optional)">
              <input
                className={inputCls}
                value={draft.campaign}
                onChange={(e) => setDraft({ ...draft, campaign: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description shown to customers">
            <textarea
              className={inputCls}
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Earn method">
              <select
                className={inputCls}
                value={draft.earnType}
                onChange={(e) =>
                  setDraft({ ...draft, earnType: e.target.value as LoyaltyProgram["earnType"] })
                }
              >
                <option value="product">Per product</option>
                <option value="category">Per category</option>
                <option value="order">Per order</option>
                <option value="amount">Per amount spent</option>
              </select>
            </Field>
            {draft.earnType === "product" && (
              <Field label="Product to track">
                <select
                  className={inputCls}
                  value={draft.targetMenuItemId ?? ""}
                  onChange={(e) => setDraft({ ...draft, targetMenuItemId: e.target.value || null })}
                >
                  <option value="">— select —</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {draft.earnType === "category" && (
              <Field label="Category to track">
                <select
                  className={inputCls}
                  value={draft.targetCategoryId ?? ""}
                  onChange={(e) => setDraft({ ...draft, targetCategoryId: e.target.value || null })}
                >
                  <option value="">— select —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={draft.earnType === "amount" ? "Amount goal" : "Quantity goal"}>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={draft.threshold}
                onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Reward type">
              <select
                className={inputCls}
                value={draft.rewardType}
                onChange={(e) =>
                  setDraft({ ...draft, rewardType: e.target.value as LoyaltyProgram["rewardType"] })
                }
              >
                <option value="percent">Percentage discount</option>
                <option value="fixed">Fixed discount</option>
                <option value="free_product">Free product</option>
                <option value="free_delivery">Free delivery</option>
                <option value="points">Bonus points</option>
              </select>
            </Field>
            {(draft.rewardType === "percent" ||
              draft.rewardType === "fixed" ||
              draft.rewardType === "points") && (
              <Field label={draft.rewardType === "percent" ? "Percent off" : "Value"}>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={draft.rewardValue}
                  onChange={(e) => setDraft({ ...draft, rewardValue: Number(e.target.value) })}
                />
              </Field>
            )}
            {draft.rewardType === "free_product" && (
              <Field label="Free product">
                <select
                  className={inputCls}
                  value={draft.rewardMenuItemId ?? ""}
                  onChange={(e) => setDraft({ ...draft, rewardMenuItemId: e.target.value || null })}
                >
                  <option value="">Cheapest item in cart</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Reward label (shown to customer)">
              <input
                className={inputCls}
                value={draft.rewardLabel}
                onChange={(e) => setDraft({ ...draft, rewardLabel: e.target.value })}
                placeholder="FREE Zinger Burger"
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Field label="Expiry">
              <select
                className={inputCls}
                value={draft.expiryMode}
                onChange={(e) =>
                  setDraft({ ...draft, expiryMode: e.target.value as LoyaltyProgram["expiryMode"] })
                }
              >
                <option value="never">Never expire</option>
                <option value="days">Expire after X days</option>
                <option value="date">Specific date</option>
              </select>
            </Field>
            {draft.expiryMode === "days" && (
              <Field label="Days valid">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={draft.expiryDays ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, expiryDays: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </Field>
            )}
            {draft.expiryMode === "date" && (
              <Field label="Expires on">
                <input
                  type="date"
                  className={inputCls}
                  value={draft.expiresAt ? draft.expiresAt.slice(0, 10) : ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </Field>
            )}
            <Field label="Usage limit per customer">
              <input
                type="number"
                min={1}
                className={inputCls}
                value={draft.usageLimitPerCustomer ?? ""}
                placeholder="Unlimited"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    usageLimitPerCustomer: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
            <Field label="Priority (lower shows first)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Stacking">
              <select
                className={inputCls}
                value={draft.stackMode}
                onChange={(e) =>
                  setDraft({ ...draft, stackMode: e.target.value as LoyaltyProgram["stackMode"] })
                }
              >
                <option value="stack_all">Allow with offers & promotions</option>
                <option value="offers_only">Allow with offers only</option>
                <option value="promotions_only">Allow with promotions only</option>
                <option value="exclusive">Cannot be combined</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 text-sm mt-6">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Enabled
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="px-5 py-3 bg-brand-black text-white font-bold uppercase text-xs tracking-tighter inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </button>
            <button
              onClick={() => setDraft(null)}
              className="px-5 py-3 border border-brand-black/20 font-bold uppercase text-xs tracking-tighter inline-flex items-center gap-2"
            >
              <X className="size-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(data?.programs ?? []).length === 0 && (
          <p className="text-white/50 text-sm">
            No loyalty programs yet. Create one to start rewarding repeat customers.
          </p>
        )}
        {(data?.programs ?? []).map((p) => {
          const stats = a?.perProgram.find((x) => x.programId === p.id);
          return (
            <div key={p.id} className="bg-white text-brand-black p-5">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <div className="font-display text-2xl uppercase tracking-tighter flex items-center gap-2">
                    <Gift className="size-4 text-brand-red" /> {p.name}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-brand-black/50 mt-1">
                    {p.earnType} · goal {p.threshold} · {p.rewardType}
                    {p.rewardValue ? ` ${p.rewardValue}` : ""} ·{" "}
                    {p.active ? "enabled" : "disabled"} · {p.stackMode}
                  </div>
                  {stats && (
                    <div className="font-mono text-[11px] text-brand-black/40 mt-1">
                      {stats.unlocked} unlocked · {stats.redeemed} redeemed
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDraft(p)}
                    className="px-4 py-2 border border-brand-black/20 font-bold uppercase text-xs tracking-tighter"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => destroy(p.id)}
                    disabled={saving}
                    aria-label={`Delete ${p.name}`}
                    className="px-3 py-2 border border-brand-black/20 text-brand-red disabled:opacity-60"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {a && a.topCustomers.length > 0 && (
        <div className="bg-white text-brand-black p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-black/40">
            Most loyal customers
          </div>
          <div className="mt-3 space-y-2">
            {a.topCustomers.map((c) => (
              <div key={c.phone} className="flex justify-between text-sm font-mono">
                <span>{c.phone}</span>
                <span>
                  {c.orders} orders · Rs. {Math.round(c.spend)} · {c.rewards} rewards
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

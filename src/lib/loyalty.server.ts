import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  CustomerLoyaltySnapshot,
  CustomerOrderSummary,
  LoyaltyProgram,
  LoyaltyProgressEntry,
  LoyaltyRewardRecord,
} from "./loyalty.types";
import { rewardSummary } from "./loyalty.types";

type CloudClient = SupabaseClient<Database>;

const PROGRAM_COLUMNS =
  "id,name,description,earn_type,target_menu_item_id,target_category_id,threshold,reward_type,reward_value,reward_menu_item_id,reward_label,active,priority,usage_limit_per_customer,expiry_mode,expiry_days,expires_at,stack_mode,campaign,applicable_customer_ids";

type ProgramRow = {
  id: string;
  name: string;
  description: string;
  earn_type: string;
  target_menu_item_id: string | null;
  target_category_id: string | null;
  threshold: number | string;
  reward_type: string;
  reward_value: number | string;
  reward_menu_item_id: string | null;
  reward_label: string;
  active: boolean;
  priority: number;
  usage_limit_per_customer: number | null;
  expiry_mode: string;
  expiry_days: number | null;
  expires_at: string | null;
  stack_mode: string;
  campaign: string;
  applicable_customer_ids: string[] | null;
};

export function mapProgram(row: ProgramRow): LoyaltyProgram {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    earnType: row.earn_type as LoyaltyProgram["earnType"],
    targetMenuItemId: row.target_menu_item_id,
    targetCategoryId: row.target_category_id,
    threshold: Number(row.threshold),
    rewardType: row.reward_type as LoyaltyProgram["rewardType"],
    rewardValue: Number(row.reward_value),
    rewardMenuItemId: row.reward_menu_item_id,
    rewardLabel: row.reward_label,
    active: row.active,
    priority: row.priority,
    usageLimitPerCustomer: row.usage_limit_per_customer,
    expiryMode: row.expiry_mode as LoyaltyProgram["expiryMode"],
    expiryDays: row.expiry_days,
    expiresAt: row.expires_at,
    stackMode: row.stack_mode as LoyaltyProgram["stackMode"],
    campaign: row.campaign,
    applicableCustomerIds: row.applicable_customer_ids ?? [],
  };
}

export async function fetchPrograms(supabase: CloudClient, onlyActive: boolean) {
  let query = supabase.from("loyalty_programs").select(PROGRAM_COLUMNS).order("priority", {
    ascending: true,
  });
  if (onlyActive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapProgram(r as unknown as ProgramRow));
}

function programLive(p: LoyaltyProgram, userId: string) {
  if (!p.active) return false;
  if (p.applicableCustomerIds.length > 0 && !p.applicableCustomerIds.includes(userId)) return false;
  if (p.expiryMode === "date" && p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()) {
    return false;
  }
  return true;
}

type OrderRow = {
  id: string;
  total: number | string;
  status: string;
  created_at: string;
  items: unknown;
};

function mapOrder(row: OrderRow): CustomerOrderSummary {
  return {
    id: row.id,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    items: (Array.isArray(row.items) ? row.items : []) as CustomerOrderSummary["items"],
  };
}

/** Total earned progress per program from the customer's real order history. */
function computeRaw(
  program: LoyaltyProgram,
  orders: CustomerOrderSummary[],
  categoryItemIds: Set<string>,
) {
  const counted = orders.filter((o) => o.status !== "cancelled");
  switch (program.earnType) {
    case "order":
      return counted.length;
    case "amount":
      return counted.reduce((s, o) => s + o.total, 0);
    case "product":
      return counted.reduce(
        (s, o) =>
          s +
          o.items
            .filter((i) => i.menuItemId === program.targetMenuItemId)
            .reduce((q, i) => q + i.quantity, 0),
        0,
      );
    case "category":
      return counted.reduce(
        (s, o) =>
          s +
          o.items
            .filter((i) => categoryItemIds.has(i.menuItemId))
            .reduce((q, i) => q + i.quantity, 0),
        0,
      );
  }
}

function unitFor(program: LoyaltyProgram): LoyaltyProgressEntry["unit"] {
  if (program.earnType === "amount") return "amount";
  if (program.earnType === "order") return "orders";
  return "items";
}

function progressMessage(program: LoyaltyProgram, remaining: number) {
  const reward = rewardSummary(program.rewardType, program.rewardValue, program.rewardLabel);
  if (remaining <= 0) return `Reward unlocked — ${reward} is waiting for you.`;
  if (program.earnType === "amount") return `Spend Rs. ${Math.ceil(remaining)} more to unlock ${reward}.`;
  if (program.earnType === "order") {
    return `${Math.ceil(remaining)} more order${remaining > 1 ? "s" : ""} to unlock ${reward}.`;
  }
  return `Only ${Math.ceil(remaining)} more to unlock ${reward}.`;
}

async function categoryItemMap(supabase: CloudClient, programs: LoyaltyProgram[]) {
  const categoryIds = Array.from(
    new Set(programs.map((p) => p.targetCategoryId).filter((v): v is string => Boolean(v))),
  );
  const map = new Map<string, Set<string>>();
  if (categoryIds.length === 0) return map;
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,category_id")
    .in("category_id", categoryIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (!row.category_id) continue;
    const set = map.get(row.category_id) ?? new Set<string>();
    set.add(row.id);
    map.set(row.category_id, set);
  }
  return map;
}

/**
 * Recomputes loyalty progress from real orders and issues any newly earned rewards.
 * Writes go through the privileged client because customers may never touch progress.
 */
export async function evaluateLoyalty(
  supabase: CloudClient,
  adminClient: CloudClient,
  userId: string,
  customerPhone: string,
) {
  const programs = (await fetchPrograms(supabase, true)).filter((p) => programLive(p, userId));
  if (programs.length === 0) return [];

  const [ordersRes, rewardsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total,status,created_at,items")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("loyalty_rewards").select("id,program_id,status").eq("user_id", userId),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (rewardsRes.error) throw new Error(rewardsRes.error.message);

  const orders = (ordersRes.data ?? []).map((r) => mapOrder(r as unknown as OrderRow));
  const catMap = await categoryItemMap(supabase, programs);

  const issuedByProgram = new Map<string, number>();
  for (const r of rewardsRes.data ?? []) {
    issuedByProgram.set(r.program_id, (issuedByProgram.get(r.program_id) ?? 0) + 1);
  }

  const newRewards: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];

  for (const p of programs) {
    const raw = computeRaw(p, orders, catMap.get(p.targetCategoryId ?? "") ?? new Set());
    const earnedCycles = Math.floor(raw / p.threshold);
    const already = issuedByProgram.get(p.id) ?? 0;
    let toIssue = earnedCycles - already;
    if (p.usageLimitPerCustomer !== null) {
      toIssue = Math.min(toIssue, Math.max(0, p.usageLimitPerCustomer - already));
    }
    for (let i = 0; i < toIssue; i += 1) {
      const expiresAt =
        p.expiryMode === "days" && p.expiryDays
          ? new Date(Date.now() + p.expiryDays * 86_400_000).toISOString()
          : p.expiryMode === "date"
            ? p.expiresAt
            : null;
      newRewards.push({
        program_id: p.id,
        user_id: userId,
        customer_phone: customerPhone,
        status: "unlocked",
        reward_type: p.rewardType,
        reward_value: p.rewardValue,
        reward_label: rewardSummary(p.rewardType, p.rewardValue, p.rewardLabel),
        expires_at: expiresAt,
      });
      notifications.push({
        user_id: userId,
        program_id: p.id,
        kind: "unlocked",
        title: "Congratulations! Reward unlocked",
        body: `You've unlocked ${rewardSummary(p.rewardType, p.rewardValue, p.rewardLabel)} from "${p.name}".`,
      });
    }
  }

  if (newRewards.length > 0) {
    const { error } = await adminClient.from("loyalty_rewards").insert(newRewards as never);
    if (error) throw new Error(error.message);
    await adminClient.from("loyalty_notifications").insert(notifications as never);
  }

  return newRewards;
}

export async function loadCustomerLoyalty(
  supabase: CloudClient,
  userId: string,
): Promise<CustomerLoyaltySnapshot> {
  const programs = (await fetchPrograms(supabase, true)).filter((p) => programLive(p, userId));

  const [ordersRes, rewardsRes, notifRes, favRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total,status,created_at,items")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("loyalty_rewards")
      .select("id,program_id,status,reward_type,reward_value,reward_label,expires_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_notifications")
      .select("id,kind,title,body,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("customer_favorites").select("menu_item_id").eq("user_id", userId),
  ]);

  const failed = [ordersRes, rewardsRes, notifRes, favRes].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const orders = (ordersRes.data ?? []).map((r) => mapOrder(r as unknown as OrderRow));
  const catMap = await categoryItemMap(supabase, programs);

  const issuedByProgram = new Map<string, number>();
  for (const r of rewardsRes.data ?? []) {
    issuedByProgram.set(r.program_id, (issuedByProgram.get(r.program_id) ?? 0) + 1);
  }

  const programNames = new Map(programs.map((p) => [p.id, p.name]));

  const progress: LoyaltyProgressEntry[] = programs.map((p) => {
    const raw = computeRaw(p, orders, catMap.get(p.targetCategoryId ?? "") ?? new Set());
    const issued = issuedByProgram.get(p.id) ?? 0;
    const current = Math.max(0, raw - issued * p.threshold);
    const remaining = Math.max(0, p.threshold - current);
    return {
      programId: p.id,
      name: p.name,
      description: p.description,
      earnType: p.earnType,
      unit: unitFor(p),
      threshold: p.threshold,
      current,
      remaining,
      percent: Math.min(100, Math.round((current / p.threshold) * 100)),
      rewardLabel: rewardSummary(p.rewardType, p.rewardValue, p.rewardLabel),
      message: progressMessage(p, remaining),
    };
  });

  const rewards: LoyaltyRewardRecord[] = (rewardsRes.data ?? []).map((r) => ({
    id: r.id,
    programId: r.program_id,
    programName: programNames.get(r.program_id) ?? "Loyalty reward",
    status: r.status as LoyaltyRewardRecord["status"],
    rewardType: r.reward_type as LoyaltyRewardRecord["rewardType"],
    rewardValue: Number(r.reward_value),
    rewardLabel: r.reward_label,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));

  const counts = new Map<string, { name: string; quantity: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const i of o.items) {
      const prev = counts.get(i.menuItemId);
      counts.set(i.menuItemId, {
        name: i.name,
        quantity: (prev?.quantity ?? 0) + i.quantity,
      });
    }
  }

  return {
    progress,
    rewards,
    notifications: (notifRes.data ?? []).map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    favorites: (favRes.data ?? []).map((f) => f.menu_item_id),
    orders,
    mostOrdered: Array.from(counts.entries())
      .map(([menuItemId, v]) => ({ menuItemId, name: v.name, quantity: v.quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6),
  };
}

/* ------------------------------- Admin analytics ------------------------------ */

export type LoyaltyAnalytics = {
  totalRewards: number;
  redeemedRewards: number;
  unusedRewards: number;
  redemptionRate: number;
  repeatCustomers: number;
  totalCustomers: number;
  perProgram: Array<{
    programId: string;
    name: string;
    unlocked: number;
    redeemed: number;
  }>;
  topCustomers: Array<{ phone: string; orders: number; spend: number; rewards: number }>;
};

export async function loadLoyaltyAnalytics(
  supabase: CloudClient,
  programs: LoyaltyProgram[],
): Promise<LoyaltyAnalytics> {
  const [rewardsRes, ordersRes] = await Promise.all([
    supabase.from("loyalty_rewards").select("id,program_id,status,customer_phone"),
    supabase.from("orders").select("customer_phone,total,status").limit(2000),
  ]);
  if (rewardsRes.error) throw new Error(rewardsRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  const rewards = rewardsRes.data ?? [];
  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled");

  const byPhone = new Map<string, { orders: number; spend: number; rewards: number }>();
  for (const o of orders) {
    const key = o.customer_phone || "unknown";
    const prev = byPhone.get(key) ?? { orders: 0, spend: 0, rewards: 0 };
    byPhone.set(key, { ...prev, orders: prev.orders + 1, spend: prev.spend + Number(o.total) });
  }
  for (const r of rewards) {
    const key = r.customer_phone || "unknown";
    const prev = byPhone.get(key);
    if (prev) byPhone.set(key, { ...prev, rewards: prev.rewards + 1 });
  }

  const redeemed = rewards.filter((r) => r.status === "redeemed").length;

  return {
    totalRewards: rewards.length,
    redeemedRewards: redeemed,
    unusedRewards: rewards.filter((r) => r.status === "unlocked").length,
    redemptionRate: rewards.length ? Math.round((redeemed / rewards.length) * 100) : 0,
    repeatCustomers: Array.from(byPhone.values()).filter((v) => v.orders > 1).length,
    totalCustomers: byPhone.size,
    perProgram: programs.map((p) => ({
      programId: p.id,
      name: p.name,
      unlocked: rewards.filter((r) => r.program_id === p.id && r.status === "unlocked").length,
      redeemed: rewards.filter((r) => r.program_id === p.id && r.status === "redeemed").length,
    })),
    topCustomers: Array.from(byPhone.entries())
      .map(([phone, v]) => ({ phone, ...v }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8),
  };
}

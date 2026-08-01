export type LoyaltyEarnType = "product" | "category" | "order" | "amount";
export type LoyaltyRewardType = "percent" | "fixed" | "free_product" | "free_delivery" | "points";
export type LoyaltyExpiryMode = "never" | "days" | "date";
export type LoyaltyStackMode = "stack_all" | "offers_only" | "promotions_only" | "exclusive";

export type LoyaltyProgram = {
  id: string;
  name: string;
  description: string;
  earnType: LoyaltyEarnType;
  targetMenuItemId: string | null;
  targetCategoryId: string | null;
  threshold: number;
  rewardType: LoyaltyRewardType;
  rewardValue: number;
  rewardMenuItemId: string | null;
  rewardLabel: string;
  active: boolean;
  priority: number;
  usageLimitPerCustomer: number | null;
  expiryMode: LoyaltyExpiryMode;
  expiryDays: number | null;
  expiresAt: string | null;
  stackMode: LoyaltyStackMode;
  campaign: string;
  applicableCustomerIds: string[];
};

export type LoyaltyRewardRecord = {
  id: string;
  programId: string;
  programName: string;
  status: "unlocked" | "redeemed" | "expired";
  rewardType: LoyaltyRewardType;
  rewardValue: number;
  rewardLabel: string;
  expiresAt: string | null;
  createdAt: string;
};

export type LoyaltyProgressEntry = {
  programId: string;
  name: string;
  description: string;
  earnType: LoyaltyEarnType;
  unit: "items" | "orders" | "amount";
  threshold: number;
  current: number;
  remaining: number;
  percent: number;
  rewardLabel: string;
  message: string;
};

export type LoyaltyNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type CustomerLoyaltySnapshot = {
  progress: LoyaltyProgressEntry[];
  rewards: LoyaltyRewardRecord[];
  notifications: LoyaltyNotification[];
  favorites: string[];
  orders: CustomerOrderSummary[];
  mostOrdered: Array<{ menuItemId: string; name: string; quantity: number }>;
};

export type CustomerOrderSummary = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    menuItemId: string;
    name: string;
    variantId: string | null;
    variantName: string | null;
    addons: Array<{ id: string; name: string; price: number }>;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    notes?: string | null;
  }>;
};

export function rewardSummary(
  rewardType: LoyaltyRewardType,
  rewardValue: number,
  rewardLabel: string,
): string {
  if (rewardLabel.trim()) return rewardLabel.trim();
  switch (rewardType) {
    case "percent":
      return `${rewardValue}% off`;
    case "fixed":
      return `Rs. ${rewardValue} off`;
    case "free_product":
      return "a free item";
    case "free_delivery":
      return "free delivery";
    case "points":
      return `${rewardValue} bonus points`;
  }
}

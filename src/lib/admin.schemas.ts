import { z } from "zod";

export const ProductTypeSchema = z.enum(["simple", "variable", "combo"]);

export const MenuItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().min(5).max(240),
  price: z.number().min(0).max(999),
  imageKey: z.string().trim().min(1).max(500).default("burger"),
  tag: z.string().trim().max(24).nullable().optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  productType: ProductTypeSchema.default("simple"),
  variantLabel: z.string().trim().max(60).nullable().optional(),
  addonLabel: z.string().trim().max(60).nullable().optional(),
  variantRequired: z.boolean().default(true),
  maxAddons: z.number().int().min(0).max(50).nullable().optional(),
  badges: z.array(z.string().trim().min(1).max(30)).max(4).default([]),
  searchKeywords: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  spiceLevel: z.number().int().min(0).max(3).default(0),
  inStock: z.boolean().default(true),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  availableUntil: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  prepTimeMinutes: z.number().int().min(0).max(600).nullable().optional(),
  recommendedIds: z.array(z.string().uuid()).max(12).default([]),
  frequentlyBoughtIds: z.array(z.string().uuid()).max(12).default([]),
  mealUpgradeIds: z.array(z.string().uuid()).max(6).default([]),
  mealUpgradeLabel: z.string().trim().min(1).max(60).default("Complete your meal"),
});



export const ORDER_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export const OrderStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

export const CustomerOrderInputSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(5).max(30),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        addonIds: z.array(z.string().uuid()).max(20).default([]),
        quantity: z.number().int().min(1).max(50).default(1),
        notes: z.string().trim().max(200).nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
  notes: z.string().trim().max(500).nullable().optional(),
  loyaltyRewardId: z.string().uuid().nullable().optional(),
});

export const CategoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
  defaultProductType: ProductTypeSchema.default("simple"),
  variantLabel: z.string().trim().min(1).max(60).default("Choose an option"),
  addonLabel: z.string().trim().min(1).max(60).default("Add-ons"),
  /** One-tap ordering for this category (drinks, desserts…). */
  quickAdd: z.boolean().default(false),
  /** Pre-enable "Complete your meal" upsells for new products here. */
  mealUpgradeDefault: z.boolean().default(false),
});


export const VariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  menuItemId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(9999),
  available: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(100),
});

export const AddonInputSchema = z.object({
  id: z.string().uuid().optional(),
  menuItemId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(9999),
  available: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(100),
});

export const OfferInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  imageKey: z.string().trim().max(500).default(""),
  discountLabel: z.string().trim().max(60).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(100),
});

export const GalleryInputSchema = z.object({
  id: z.string().uuid().optional(),
  imageKey: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(200).nullable().optional(),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
});

export const TestimonialInputSchema = z.object({
  id: z.string().uuid().optional(),
  customerName: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5).default(5),
  review: z.string().trim().min(1).max(500),
  imageKey: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(100),
});

export const HeroInputSchema = z.object({
  heading: z.string().trim().max(160).default(""),
  subheading: z.string().trim().max(300).default(""),
  ctaText: z.string().trim().max(40).default("Order Now"),
  backgroundKey: z.string().trim().max(500).default(""),
  bannerKey: z.string().trim().max(500).default(""),
});

export const BusinessSettingsInputSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  logoKey: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(40).default(""),
  whatsappNumber: z.string().trim().min(5).max(30),
  email: z.string().trim().max(120).default(""),
  address: z.string().trim().max(300).default(""),
  mapsUrl: z.string().trim().max(500).default(""),
  hours: z
    .array(z.object({ day: z.string().max(40), open: z.string().max(10), close: z.string().max(10) }))
    .default([]),
  deliveryCharges: z.number().min(0).max(9999).default(0),
  minOrder: z.number().min(0).max(9999).default(0),
  social: z
    .object({
      instagram: z.string().max(200).optional(),
      facebook: z.string().max(200).optional(),
      tiktok: z.string().max(200).optional(),
    })
    .default({}),
});

export const LoyaltyProgramInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).default(""),
  earnType: z.enum(["product", "category", "order", "amount"]).default("product"),
  targetMenuItemId: z.string().uuid().nullable().optional(),
  targetCategoryId: z.string().uuid().nullable().optional(),
  threshold: z.number().min(0.01).max(1_000_000),
  rewardType: z
    .enum(["percent", "fixed", "free_product", "free_delivery", "points"])
    .default("free_product"),
  rewardValue: z.number().min(0).max(1_000_000).default(0),
  rewardMenuItemId: z.string().uuid().nullable().optional(),
  rewardLabel: z.string().trim().max(120).default(""),
  active: z.boolean().default(true),
  priority: z.number().int().min(0).max(9999).default(100),
  usageLimitPerCustomer: z.number().int().min(1).max(999).nullable().optional(),
  expiryMode: z.enum(["never", "days", "date"]).default("never"),
  expiryDays: z.number().int().min(1).max(3650).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  stackMode: z
    .enum(["stack_all", "offers_only", "promotions_only", "exclusive"])
    .default("stack_all"),
  campaign: z.string().trim().max(80).default(""),
  applicableCustomerIds: z.array(z.string().uuid()).max(500).default([]),
});

export type LoyaltyProgramInput = z.infer<typeof LoyaltyProgramInputSchema>;

/* ------------------------------ Marketing engine ----------------------------- */

export const PromoTypeSchema = z.enum([
  "percent",
  "fixed",
  "buy_x_get_y",
  "free_item",
  "free_delivery",
  "bundle",
  "order_value",
]);

export const PromotionItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  role: z.enum(["bundle", "buy", "get"]).default("bundle"),
});

export const PromotionInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  promoType: PromoTypeSchema.default("percent"),
  headline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(600).default(""),
  imageKey: z.string().trim().max(500).default(""),
  badgeLabel: z.string().trim().max(60).default(""),
  targetScope: z.enum(["store", "category", "product", "variant"]).default("store"),
  targetCategoryIds: z.array(z.string().uuid()).max(50).default([]),
  targetMenuItemIds: z.array(z.string().uuid()).max(200).default([]),
  targetVariantIds: z.array(z.string().uuid()).max(200).default([]),
  discountValue: z.number().min(0).max(1_000_000).default(0),
  minOrderAmount: z.number().min(0).max(1_000_000).default(0),
  buyQuantity: z.number().int().min(0).max(50).default(0),
  getQuantity: z.number().int().min(0).max(50).default(0),
  getMenuItemId: z.string().uuid().nullable().optional(),
  getDiscountPercent: z.number().min(0).max(100).default(0),
  bundlePrice: z.number().min(0).max(1_000_000).nullable().optional(),
  freeDelivery: z.boolean().default(false),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).max(999).nullable().optional(),
  stockLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  campaign: z.string().trim().max(80).default(""),
  season: z.string().trim().max(80).default(""),
  priority: z.number().int().min(0).max(9999).default(100),
  stackMode: z.enum(["stackable", "exclusive"]).default("stackable"),
  applicableCustomerIds: z.array(z.string().uuid()).max(500).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(true),
  seoTitle: z.string().trim().max(120).default(""),
  seoDescription: z.string().trim().max(200).default(""),
  items: z.array(PromotionItemInputSchema).max(20).default([]),
});

export type PromotionInput = z.infer<typeof PromotionInputSchema>;

export const DeleteByIdSchema = z.object({ id: z.string().uuid() });



export const UploadMediaSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120),
  base64: z.string().min(1),
});

export type MenuItemInput = z.infer<typeof MenuItemInputSchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type VariantInput = z.infer<typeof VariantInputSchema>;
export type AddonInput = z.infer<typeof AddonInputSchema>;
export type OfferInput = z.infer<typeof OfferInputSchema>;
export type GalleryInput = z.infer<typeof GalleryInputSchema>;
export type TestimonialInput = z.infer<typeof TestimonialInputSchema>;
export type HeroInput = z.infer<typeof HeroInputSchema>;
export type BusinessSettingsInput = z.infer<typeof BusinessSettingsInputSchema>;

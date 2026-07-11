import { z } from "zod";

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
});

export const OrderStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "preparing", "ready", "completed", "cancelled"]),
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
      }),
    )
    .min(1)
    .max(30),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const CategoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  displayOrder: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
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

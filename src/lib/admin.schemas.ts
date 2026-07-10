import { z } from "zod";

export const MenuItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().min(5).max(240),
  price: z.number().min(0).max(999),
  imageKey: z.string().trim().min(2).max(40).default("burger"),
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

export type MenuItemInput = z.infer<typeof MenuItemInputSchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type VariantInput = z.infer<typeof VariantInputSchema>;
export type AddonInput = z.infer<typeof AddonInputSchema>;

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
  items: z.array(z.object({ name: z.string().trim().min(2).max(80), price: z.number().min(0).max(999) })).min(1).max(30),
  subtotal: z.number().min(0).max(9999),
  discount: z.number().min(0).max(9999).default(0),
  total: z.number().min(0).max(9999),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type MenuItemInput = z.infer<typeof MenuItemInputSchema>;
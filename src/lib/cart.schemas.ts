import { z } from "zod";

/**
 * The only cart shape the browser is allowed to send: ids and quantities.
 * Prices, discounts and totals are always computed on the server.
 */
export const CartLineSchema = z.object({
  menuItemId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  addonIds: z.array(z.string().uuid()).max(20).default([]),
  quantity: z.number().int().min(1).max(50).default(1),
});

export type CartLineInput = z.infer<typeof CartLineSchema>;

export const QuoteCartSchema = z.object({
  items: z.array(CartLineSchema).max(30).default([]),
  userId: z.string().uuid().nullable().optional(),
});

export const PromotionPreviewSchema = z.object({
  promotionId: z.string().uuid(),
  items: z.array(CartLineSchema).min(1).max(20),
});

export const PromotionSlugSchema = z.object({ slug: z.string().min(1).max(120) });

export const PromotionIdSchema = z.object({ id: z.string().uuid() });

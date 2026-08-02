import { z } from "zod";

export const RecommendInputSchema = z.object({
  cart: z.array(z.string()).max(20),
  pastOrders: z.array(z.string()).max(30),
  menu: z.array(z.string()).max(50),
});

/** Fast, cheap model — recommendations are a nice-to-have, never a blocker. */
export const RECOMMEND_MODEL = "google/gemini-3-flash-preview";

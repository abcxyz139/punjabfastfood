// Prompt construction + strict response parsing for AI recommendations.
import type { z } from "zod";
import type { RecommendInputSchema } from "./recommend.schemas";

type RecommendInput = z.infer<typeof RecommendInputSchema>;

export function buildRecommendPrompt(data: RecommendInput) {
  const system = `You are the head chef at Punjab Fast Food, a premium Punjabi street food brand.
You recommend menu items a customer will love. Recommendations MUST come from the provided menu list — never invent dishes.
Return STRICT JSON only, no prose, in this shape:
{"picks":[{"name":"<menu item>","reason":"<one short addictive sentence, max 18 words>"}]}
Pick exactly 3 items. Avoid items already in the current cart.`;

  const user = `Menu (only choose from these): ${data.menu.join(", ")}
Current cart: ${data.cart.length ? data.cart.join(", ") : "(empty)"}
Past orders: ${
    data.pastOrders.length
      ? data.pastOrders.join(", ")
      : "(none yet — assume a first-time visitor who likes bold flavors)"
  }`;

  return { system, user };
}

export type RecommendPick = { name: string; reason: string };

/** Never trust the model: only names present in the real menu survive. */
export function parseRecommendations(content: string, menu: string[]): RecommendPick[] {
  let parsed: { picks?: RecommendPick[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        return [];
      }
    }
  }

  const valid = new Set(menu);
  return (parsed.picks ?? [])
    .filter((p) => p && typeof p.name === "string" && valid.has(p.name))
    .map((p) => ({ name: p.name, reason: String(p.reason ?? "") }))
    .slice(0, 3);
}

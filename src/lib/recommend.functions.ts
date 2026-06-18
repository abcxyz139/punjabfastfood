import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  cart: z.array(z.string()).max(20),
  pastOrders: z.array(z.string()).max(30),
  menu: z.array(z.string()).max(50),
});

const MODEL = "google/gemini-3-flash-preview";

export const recommendDishes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are the head chef at Punjab Fast Food, a premium Punjabi street food brand.
You recommend menu items a customer will love. Recommendations MUST come from the provided menu list — never invent dishes.
Return STRICT JSON only, no prose, in this shape:
{"picks":[{"name":"<menu item>","reason":"<one short addictive sentence, max 18 words>"}]}
Pick exactly 3 items. Avoid items already in the current cart.`;

    const user = `Menu (only choose from these): ${data.menu.join(", ")}
Current cart: ${data.cart.length ? data.cart.join(", ") : "(empty)"}
Past orders: ${data.pastOrders.length ? data.pastOrders.join(", ") : "(none yet — assume a first-time visitor who likes bold flavors)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";

    let parsed: { picks?: { name: string; reason: string }[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const validNames = new Set(data.menu);
    const picks = (parsed.picks ?? [])
      .filter((p) => p && typeof p.name === "string" && validNames.has(p.name))
      .slice(0, 3);

    return { picks };
  });

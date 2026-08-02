import { createServerFn } from "@tanstack/react-start";
import { RECOMMEND_MODEL, RecommendInputSchema } from "./recommend.schemas";
import { buildRecommendPrompt, parseRecommendations } from "./recommend.server";

export const recommendDishes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RecommendInputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { system, user } = buildRecommendPrompt(data);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: RECOMMEND_MODEL,
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

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { picks: parseRecommendations(json.choices?.[0]?.message?.content ?? "{}", data.menu) };
  });

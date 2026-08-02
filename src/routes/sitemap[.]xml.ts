// Dynamic sitemap: the homepage plus every live campaign landing page.
import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/sitemap[.]xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/supabase-public.server");
        const urls: Array<{ loc: string; priority: string }> = [
          { loc: `${SITE_URL}/`, priority: "1.0" },
        ];

        try {
          const { data } = await publicClient()
            .from("promotions")
            .select("slug")
            .eq("active", true);
          for (const row of data ?? []) {
            if (row.slug) urls.push({ loc: `${SITE_URL}/deals/${row.slug}`, priority: "0.7" });
          }
        } catch {
          // A database hiccup must never break the sitemap — serve the homepage entry.
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Tag, Timer, Gift } from "lucide-react";
import { getPromotionBySlug } from "@/lib/marketing.functions";
import { promotionLabel, scheduleLabel, remainingStock } from "@/lib/marketing.types";
import { PromoCountdown } from "@/components/marketing";
import { canonical } from "@/lib/site";

export const Route = createFileRoute("/deals/$slug")({
  loader: ({ params }) => getPromotionBySlug({ data: { slug: params.slug } }),
  head: ({ loaderData, params }) => {
    const promo = loaderData?.promotion;
    const title = promo
      ? (promo.seoTitle || `${promo.name} — Punjab Fast Food Deal`).slice(0, 60)
      : "Deal not found — Punjab Fast Food";
    const description = promo
      ? (promo.seoDescription || promo.headline || promo.description || `Grab the ${promo.name} deal at Punjab Fast Food.`).slice(0, 158)
      : "This Punjab Fast Food campaign is no longer running. Browse today's live deals instead.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(promo ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ],
      links: [{ rel: "canonical", href: canonical(`/deals/${params.slug}`) }],
    };
  },

  errorComponent: () => (
    <Shell title="Deal unavailable" body="We couldn't load this campaign. Please try again." />
  ),
  notFoundComponent: () => <Shell title="Deal not found" body="This campaign has ended." />,
  component: DealPage,
});

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-brand-cream grid place-items-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-5xl uppercase tracking-tighter mb-4">{title}</h1>
        <p className="text-sm text-brand-black/60 mb-8">{body}</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red text-white font-bold uppercase text-xs tracking-tighter hover:bg-brand-black transition-colors">
          <ArrowLeft className="size-4" /> Back to menu
        </Link>
      </div>
    </main>
  );
}

function DealPage() {
  const { promotion, items, itemNames } = Route.useLoaderData();

  if (!promotion) {
    return <Shell title="Deal not found" body="This campaign has ended or is not running right now." />;
  }

  const label = promotionLabel(promotion, itemNames);
  const schedule = scheduleLabel(promotion);
  const left = remainingStock(promotion);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: promotion.name,
    description: promotion.seoDescription || promotion.headline || promotion.description,
    availability: "https://schema.org/InStock",
    priceCurrency: "USD",
    ...(promotion.bundlePrice !== null ? { price: promotion.bundlePrice } : {}),
    ...(promotion.startsAt ? { validFrom: promotion.startsAt } : {}),
    ...(promotion.endsAt ? { validThrough: promotion.endsAt } : {}),
    offeredBy: { "@type": "Restaurant", name: "Punjab Fast Food" },
  };

  return (
    <main className="min-h-screen bg-brand-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-brand-black text-white px-6 pt-28 pb-16">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-gold inline-flex items-center gap-2 mb-8 hover:text-white transition-colors">
            <ArrowLeft className="size-3" /> Back to menu
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-widest text-brand-orange mb-3 flex items-center gap-2">
            <Tag className="size-3" /> {promotion.campaign || promotion.season || "Live campaign"}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl md:text-7xl uppercase tracking-tighter mb-4"
          >
            {promotion.name}
          </motion.h1>
          <p className="text-white/70 max-w-2xl mb-6">{promotion.headline || promotion.description}</p>

          <div className="flex flex-wrap gap-3 items-center mb-6">
            <span className="bg-brand-orange text-brand-black font-display text-2xl px-4 py-1 uppercase tracking-tighter">{label}</span>
            {promotion.minOrderAmount > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-2">
                Min order ${promotion.minOrderAmount.toFixed(2)}
              </span>
            )}
            {schedule && (
              <span className="font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-2 flex items-center gap-1">
                <Timer className="size-3" /> {schedule}
              </span>
            )}
            {left !== null && (
              <span className="font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-2">Only {left} left</span>
            )}
          </div>

          <PromoCountdown endsAt={promotion.endsAt} />
        </div>
      </section>

      {items.length > 0 && (
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl uppercase tracking-tighter mb-6">Included in this deal</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((i: (typeof items)[number]) => (
                <div key={i.id} className="bg-white p-5">
                  <div className="font-display text-xl uppercase tracking-tighter">{i.name}</div>
                  <p className="text-xs text-brand-black/60 mt-2 line-clamp-3">{i.description}</p>
                  <div className="font-mono text-sm font-bold mt-3">${i.price.toFixed(2)}</div>
                  {promotion.getMenuItemId === i.id && (
                    <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-brand-red flex items-center gap-1">
                      <Gift className="size-3" /> Free with this deal
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Link
              to="/"
              hash="menu"
              className="inline-block mt-10 px-8 py-4 bg-brand-red text-white font-bold uppercase text-xs tracking-tighter hover:bg-brand-black transition-colors"
            >
              Order now
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

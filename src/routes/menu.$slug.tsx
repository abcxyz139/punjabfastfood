import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { ProductDetail } from "@/components/product-detail";
import { useMenuData, useSettings } from "@/lib/storefront.hooks";
import { useCartState } from "@/lib/cart.store";
import { canonical } from "@/lib/site";

export const Route = createFileRoute("/menu/$slug")({
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${pretty} — Punjab Fast Food`;
    const description = `Order ${pretty} from Punjab Fast Food. Fresh Punjabi street food, ready fast, delivered hot or ordered straight on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical(`/menu/${params.slug}`) }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useMenuData();
  const { whatsappNumber, phone, restaurantName } = useSettings();
  const { cart } = useCartState();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const items = data?.items ?? [];
  const item = items.find((i) => i.slug === slug || i.id === slug);

  return (
    <div className="min-h-screen bg-white text-brand-black">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-black/10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="min-h-11 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="size-4" /> Menu
          </Link>
          <Link
            to="/"
            hash="menu"
            className="min-h-11 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest"
          >
            <ShoppingBag className="size-4" />
            {cartCount > 0 ? `${cartCount} in cart` : "Cart"}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-32 font-mono text-xs uppercase tracking-widest text-brand-black/50">
            <Loader2 className="size-4 animate-spin mr-3" /> Loading dish…
          </div>
        )}
        {error && (
          <div className="text-center py-24 font-mono text-xs uppercase text-brand-red">
            Failed to load this dish.
          </div>
        )}
        {!isLoading && !error && !item && (
          <div className="text-center py-24 px-6">
            <h1 className="font-display text-4xl uppercase tracking-tighter mb-3">Dish not found</h1>
            <p className="text-sm text-brand-black/55 mb-6">
              It may have been renamed or taken off the menu.
            </p>
            <Link
              to="/"
              hash="menu"
              className="inline-block px-6 py-4 bg-brand-black text-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red transition-colors"
            >
              Browse the full menu
            </Link>
          </div>
        )}
        {item && (
          <ProductDetail
            item={item}
            allItems={items}
            whatsappNumber={whatsappNumber}
            phone={phone}
            restaurantName={restaurantName}
          />
        )}
      </main>
    </div>
  );
}

// Shared product experience: swipe gallery, options, quantity, upsells and order CTAs.
// Used by the dedicated product page; badge styles + upsell cards are reused by the storefront grid.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Clock, Flame, Minus, Phone, Plus, MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { MenuAddon, MenuVariant, PublicMenuItem } from "@/lib/menu.types";
import { availabilityLabel, isAvailableNow } from "@/lib/menu.types";
import { addEntry } from "@/lib/cart.store";
import { resolveImg } from "@/lib/images";
import { formatPrice } from "@/lib/money";
import { FavoriteButton } from "@/components/loyalty";

export const BADGE_STYLE: Record<string, string> = {
  "Best Seller": "bg-brand-red text-white",
  Popular: "bg-brand-black text-brand-gold",
  "Chef Choice": "bg-brand-black text-white",
  "Customer Favourite": "bg-brand-gold text-brand-black",
  New: "bg-emerald-600 text-white",
  "Limited Time": "bg-brand-red text-white",
  Spicy: "bg-orange-600 text-white",
  Healthy: "bg-emerald-700 text-white",
  "Kids Favourite": "bg-sky-600 text-white",
  "Family Deal": "bg-brand-black text-brand-gold",
  "Owner Recommended": "bg-brand-gold text-brand-black",
};

export const QUICK_NOTES = [
  "Extra spicy",
  "No onion",
  "Less salt",
  "Extra sauce",
  "Cut into 8 pieces",
  "No ice",
];

/** Lowest price a customer can pay for an item (variants included). */
export function fromPrice(item: PublicMenuItem) {
  return item.variants.length > 0 ? Math.min(...item.variants.map((v) => v.price)) : item.price;
}

/** Compact one-tap suggestion card reused by every recommendation row. */
export function UpsellCard({ item, onAdd }: { item: PublicMenuItem; onAdd?: () => void }) {
  const servable = item.inStock && isAvailableNow(item.availability);
  const needsOptions = item.variants.length > 0 || item.addons.length > 0;
  const from = fromPrice(item);

  const body = (
    <>
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          src={resolveImg(item.imageKey)}
          alt={item.name}
          loading="lazy"
          decoding="async"
          width={320}
          height={240}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-2.5">
        <div className="font-bold text-xs uppercase tracking-tighter leading-tight line-clamp-2">
          {item.name}
        </div>
        <div className="font-mono text-[10px] mt-1 flex items-center justify-between">
          <span className="font-bold">
            {item.variants.length > 0 ? `From ${formatPrice(from)}` : formatPrice(from)}
          </span>
          <span className="text-brand-red font-bold uppercase">
            {!servable ? "N/A" : needsOptions ? "Pick" : "+ Add"}
          </span>
        </div>
      </div>
    </>
  );

  const shell =
    "w-40 flex-shrink-0 text-left border border-brand-black/10 hover:border-brand-black transition-colors";

  if (!servable) {
    return <div className={`${shell} opacity-40`}>{body}</div>;
  }

  // Items with choices go to their own page; simple items add in one tap.
  if (needsOptions || !onAdd) {
    return (
      <Link to="/menu/$slug" params={{ slug: item.slug }} className={shell} aria-label={`View ${item.name}`}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onAdd} className={shell} aria-label={`Add ${item.name}`}>
      {body}
    </button>
  );
}

export function UpsellRow({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: PublicMenuItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-7">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-1">{title}</div>
      {subtitle && <p className="text-[11px] text-brand-black/50 mb-3">{subtitle}</p>}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map((i) => (
          <div key={i.id} className="snap-start">
            <UpsellCard
              item={i}
              onAdd={() => {
                addEntry({
                  menuItemId: i.id,
                  name: i.name,
                  variantId: null,
                  variantName: null,
                  addonIds: [],
                  addonNames: [],
                  unitPrice: i.price,
                  quantity: 1,
                });
                toast.success(`${i.name} added`, { description: formatPrice(i.price), duration: 1600 });
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Swipeable gallery: main photo, owner-added extras, then an optional video. */
function Gallery({ item }: { item: PublicMenuItem }) {
  const photos = useMemo(
    () => [item.imageKey, ...item.galleryKeys.filter(Boolean)],
    [item.imageKey, item.galleryKeys],
  );
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [item.id]);

  return (
    <div>
      <div className="relative aspect-square sm:aspect-[16/10] overflow-hidden bg-stone-100">
        <img
          src={resolveImg(photos[active] ?? item.imageKey)}
          alt={item.name}
          width={960}
          height={960}
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <FavoriteButton menuItemId={item.id} name={item.name} />
        </div>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 snap-x">
          {photos.map((p, i) => (
            <button
              key={`${p}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`size-16 flex-shrink-0 snap-start overflow-hidden ring-2 transition-all ${
                i === active ? "ring-brand-red" : "ring-transparent opacity-70"
              }`}
            >
              <img
                src={resolveImg(p)}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {item.videoUrl && (
        <div className="px-3 pb-3">
          <video
            src={item.videoUrl}
            controls
            playsInline
            preload="none"
            className="w-full aspect-video bg-brand-black"
          />
        </div>
      )}
    </div>
  );
}

export function ProductDetail({
  item,
  allItems,
  whatsappNumber,
  phone,
  restaurantName,
}: {
  item: PublicMenuItem;
  allItems: PublicMenuItem[];
  whatsappNumber: string;
  phone: string;
  restaurantName: string;
}) {
  const hasVariants = item.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(
    hasVariants && item.variantRequired ? item.variants[0].id : null,
  );
  const [addonIds, setAddonIds] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [mealOn, setMealOn] = useState(false);

  useEffect(() => {
    setVariantId(hasVariants && item.variantRequired ? item.variants[0].id : null);
    setAddonIds(new Set());
    setQty(1);
    setNotes("");
    setMealOn(false);
  }, [item.id, hasVariants, item.variantRequired, item.variants]);

  const byId = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems]);
  const pickList = useCallback(
    (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((i): i is PublicMenuItem => !!i && i.id !== item.id),
    [byId, item.id],
  );
  const frequently = useMemo(() => pickList(item.frequentlyBoughtIds), [pickList, item.frequentlyBoughtIds]);
  const recommended = useMemo(() => pickList(item.recommendedIds), [pickList, item.recommendedIds]);
  const mealItems = useMemo(() => pickList(item.mealUpgradeIds), [pickList, item.mealUpgradeIds]);

  /** Same-category picks fill the "Popular in" row without any owner setup. */
  const alsoInCategory = useMemo(
    () =>
      allItems
        .filter(
          (i) =>
            i.id !== item.id &&
            i.category === item.category &&
            i.inStock &&
            isAvailableNow(i.availability),
        )
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder)
        .slice(0, 8),
    [allItems, item.id, item.category],
  );

  const variant: MenuVariant | null = hasVariants
    ? (item.variants.find((v) => v.id === variantId) ?? (item.variantRequired ? item.variants[0] : null))
    : null;
  const selectedAddons: MenuAddon[] = item.addons.filter((a) => addonIds.has(a.id));
  const basePrice = variant ? variant.price : item.price;
  const unitPrice = basePrice + selectedAddons.reduce((s, a) => s + a.price, 0);
  const servableMeal = mealItems.filter((m) => m.inStock && isAvailableNow(m.availability));
  const mealPrice = servableMeal.reduce((s, m) => s + fromPrice(m), 0);
  const total = unitPrice * qty + (mealOn ? mealPrice : 0);

  const maxAddons = item.maxAddons;
  const scheduleText = availabilityLabel(item.availability);
  const onSchedule = isAvailableNow(item.availability);
  const servable = item.inStock && onSchedule;
  const displayName = variant ? `${item.name} · ${variant.name}` : item.name;

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (maxAddons === null || next.size < maxAddons) next.add(id);
      return next;
    });

  const toggleNote = (n: string) =>
    setNotes((prev) => {
      const parts = prev.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.includes(n) ? parts.filter((p) => p !== n).join(", ") : [...parts, n].join(", ");
    });

  const addToCart = () => {
    addEntry({
      menuItemId: item.id,
      name: displayName,
      variantId: variant ? variant.id : null,
      variantName: variant ? variant.name : null,
      addonIds: selectedAddons.map((a) => a.id),
      addonNames: selectedAddons.map((a) => a.name),
      unitPrice,
      quantity: qty,
      notes: notes.trim() || null,
    });
    if (mealOn) {
      for (const m of servableMeal) {
        addEntry({
          menuItemId: m.id,
          name: m.name,
          variantId: null,
          variantName: null,
          addonIds: [],
          addonNames: [],
          unitPrice: fromPrice(m),
          quantity: 1,
        });
      }
    }
    toast.success(`${displayName} added`, { description: formatPrice(total), duration: 1800 });
  };

  /** Single-item WhatsApp order for customers who never open the cart. */
  const waHref = useMemo(() => {
    const lines = [
      `*Order — ${restaurantName}*`,
      "",
      `${displayName} × ${qty} — ${formatPrice(unitPrice * qty)}`,
    ];
    if (selectedAddons.length > 0) lines.push(`Add-ons: ${selectedAddons.map((a) => a.name).join(", ")}`);
    if (mealOn && servableMeal.length > 0) {
      lines.push(`${item.mealUpgradeLabel}: ${servableMeal.map((m) => m.name).join(", ")}`);
    }
    if (notes.trim()) lines.push(`Note: ${notes.trim()}`);
    lines.push("", `*Total:* ${formatPrice(total)}`, "", "Please confirm my order. Thank you!");
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [
    restaurantName,
    displayName,
    qty,
    unitPrice,
    selectedAddons,
    mealOn,
    servableMeal,
    item.mealUpgradeLabel,
    notes,
    total,
    whatsappNumber,
  ]);

  return (
    <div className="pb-32">
      <Gallery item={item} />

      <div className="px-5 sm:px-8 pt-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-red mb-2">
          {item.category}
        </div>
        <h1 className="font-display text-3xl sm:text-5xl uppercase tracking-tighter leading-none mb-3">
          {item.name}
        </h1>

        {(item.badges.length > 0 || item.spiceLevel > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {item.badges.map((b) => (
              <span
                key={b}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${BADGE_STYLE[b] ?? "bg-brand-black text-white"}`}
              >
                {b}
              </span>
            ))}
            {item.spiceLevel > 0 && (
              <span className="flex items-center gap-0.5" aria-label={`Spice level ${item.spiceLevel} of 3`}>
                {Array.from({ length: item.spiceLevel }).map((_, i) => (
                  <Flame key={i} className="size-3 text-brand-red" />
                ))}
              </span>
            )}
          </div>
        )}

        {item.description && (
          <p className="text-sm text-brand-black/60 leading-relaxed mb-4">{item.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-brand-black/55 mb-6">
          {item.prepTimeMinutes !== null && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> Ready in ~{item.prepTimeMinutes} min
            </span>
          )}
          {scheduleText && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {scheduleText}
            </span>
          )}
          <span className={servable ? "text-emerald-700" : "text-brand-red"}>
            {item.inStock ? (onSchedule ? "Available now" : "Not serving right now") : "Sold out"}
          </span>
        </div>

        {hasVariants && (
          <section className="mb-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-2">
              {item.variantLabel}
              {item.variantRequired && <span className="text-brand-red"> *</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={`min-h-12 px-4 flex items-center justify-between border text-left transition-colors ${
                    variantId === v.id
                      ? "border-brand-black bg-brand-black text-white"
                      : "border-brand-black/15 hover:border-brand-black"
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-tight">{v.name}</span>
                  <span className="font-mono text-xs font-bold">{formatPrice(v.price)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {item.addons.length > 0 && (
          <section className="mb-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-2">
              {item.addonLabel}
              {maxAddons !== null && (
                <span className="text-brand-black/40"> — pick up to {maxAddons}</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.addons.map((a) => {
                const on = addonIds.has(a.id);
                const blocked = !on && maxAddons !== null && selectedAddons.length >= maxAddons;
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggleAddon(a.id)}
                    className={`min-h-12 px-4 flex items-center justify-between border text-left transition-colors disabled:opacity-40 ${
                      on ? "border-brand-red bg-brand-red/10" : "border-brand-black/15 hover:border-brand-black"
                    }`}
                  >
                    <span className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                      {on ? <Check className="size-4 text-brand-red" /> : <Plus className="size-4" />}
                      {a.name}
                    </span>
                    <span className="font-mono text-xs font-bold">+{formatPrice(a.price)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {servableMeal.length > 0 && (
          <button
            type="button"
            onClick={() => setMealOn((v) => !v)}
            className={`w-full min-h-14 px-4 mb-6 flex items-center justify-between border text-left transition-colors ${
              mealOn ? "border-brand-red bg-brand-red/10" : "border-brand-black/15 hover:border-brand-black"
            }`}
          >
            <span>
              <span className="block text-sm font-bold uppercase tracking-tight">
                {item.mealUpgradeLabel}
              </span>
              <span className="block text-[11px] text-brand-black/55">
                {servableMeal.map((m) => m.name).join(" + ")}
              </span>
            </span>
            <span className="font-mono text-xs font-bold">+{formatPrice(mealPrice)}</span>
          </button>
        )}

        <section className="mb-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-2">
            Special instructions
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_NOTES.map((n) => {
              const on = notes.split(",").map((s) => s.trim()).includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNote(n)}
                  className={`min-h-10 px-3 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                    on ? "bg-brand-black text-white border-brand-black" : "border-brand-black/15"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Anything else for the kitchen?"
            className="w-full border border-brand-black/15 p-3 text-sm outline-none focus:border-brand-black"
          />
        </section>

        <section className="flex items-center justify-between mb-8">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">Quantity</div>
          <div className="flex items-center border border-brand-black/15">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="size-12 grid place-items-center hover:bg-brand-black hover:text-white transition-colors"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center font-mono font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
              className="size-12 grid place-items-center hover:bg-brand-black hover:text-white transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </section>

        <UpsellRow
          title="Frequently bought together"
          subtitle="Customers usually add these"
          items={frequently}
        />
        <UpsellRow title="You may also like" items={recommended} />
        <UpsellRow title={`Popular in ${item.category}`} items={alsoInCategory} />
      </div>

      {/* Thumb-zone action bar: everything a customer needs to order. */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-brand-black/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <a
            href={`tel:${phone}`}
            aria-label="Call the restaurant"
            className="size-12 flex-shrink-0 grid place-items-center border border-brand-black/15 hover:bg-brand-black hover:text-white transition-colors"
          >
            <Phone className="size-4" />
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Order on WhatsApp"
            className="size-12 flex-shrink-0 grid place-items-center bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="size-4" />
          </a>
          <button
            type="button"
            onClick={addToCart}
            disabled={!servable}
            className="flex-1 min-h-12 bg-brand-black text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-red transition-colors disabled:bg-brand-black/20 disabled:text-brand-black/40 active:scale-[0.99]"
          >
            <ShoppingBag className="size-4" />
            {servable ? `Add · ${formatPrice(total)}` : item.inStock ? "Not serving now" : "Sold out"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

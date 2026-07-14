import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, Star, ShoppingBag, Plus, MapPin, Phone, Mail, Instagram, Facebook, MessageCircle, ChevronRight, Clock, Sparkles, Loader2, X, Check, Minus, Settings2, Trash2 } from "lucide-react";
import { recommendDishes } from "@/lib/recommend.functions";
import { getPublicMenu, getPublicSettings } from "@/lib/menu.functions";
import { createCustomerOrder } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";
import type { PublicMenuItem, MenuVariant, MenuAddon, CartEntry } from "@/lib/menu.types";

// ---------- Restaurant defaults (overridden by business_settings at runtime) ----------
const DEFAULT_RESTAURANT_NAME = "Punjab Fast Food";
const DEFAULT_WHATSAPP_NUMBER = "923017160216"; // international format, no + or spaces
const DEFAULT_DELIVERY_CHARGES = 2.5;

function buildWaUrl(number: string, text?: string) {
  const link = `https://wa.me/${number}`;
  return text ? `${link}?text=${encodeURIComponent(text)}` : link;
}

function useSettings() {
  const fetchSettings = useServerFn(getPublicSettings);
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });
  return {
    restaurantName: data?.restaurantName ?? DEFAULT_RESTAURANT_NAME,
    whatsappNumber: data?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER,
    deliveryCharges: data?.deliveryCharges ?? DEFAULT_DELIVERY_CHARGES,
    minOrder: data?.minOrder ?? 0,
  };
}

// Back-compat helpers used across static call sites — these use defaults; components
// that need live settings use useSettings() + buildWaUrl() directly.
const RESTAURANT_NAME = DEFAULT_RESTAURANT_NAME;
const WHATSAPP_NUMBER = DEFAULT_WHATSAPP_NUMBER;
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
const DELIVERY_CHARGES = DEFAULT_DELIVERY_CHARGES;

function waUrl(text?: string) {
  return text ? `${WHATSAPP_LINK}?text=${encodeURIComponent(text)}` : WHATSAPP_LINK;
}

function buildOrderMessage(
  items: CartEntry[],
  customer: { name: string; phone: string; address: string; notes: string },
  totals: { subtotal: number; delivery: number; total: number },
  meta: { restaurantName: string; orderId?: string | null },
) {
  const lines: string[] = [];
  lines.push(`*New Order — ${meta.restaurantName}*`, "");
  if (meta.orderId) lines.push(`*Order ID:* ${meta.orderId}`);
  lines.push(`*Customer:* ${customer.name}`);
  lines.push(`*Phone:* ${customer.phone}`);
  if (customer.address) lines.push(`*Address:* ${customer.address}`);
  lines.push("", "*Order:*");
  items.forEach((i, idx) => {
    lines.push(`${idx + 1}. ${i.name} × ${i.quantity} — $${(i.unitPrice * i.quantity).toFixed(2)}`);
    if (i.addonNames.length > 0) lines.push(`   Add-ons: ${i.addonNames.join(", ")}`);
  });
  lines.push("", `*Subtotal:* $${totals.subtotal.toFixed(2)}`);
  lines.push(`*Delivery:* $${totals.delivery.toFixed(2)}`);
  lines.push(`*Total:* $${totals.total.toFixed(2)}`);
  if (customer.notes) lines.push("", `*Notes:* ${customer.notes}`);
  lines.push("", "Please confirm my order. Thank you!");
  return lines.join("\n");
}


import heroSpice from "@/assets/hero-spice.jpg";
import imgBurger from "@/assets/menu-burger.jpg";
import imgPizza from "@/assets/menu-pizza.jpg";
import imgShawarma from "@/assets/menu-shawarma.jpg";
import imgFries from "@/assets/menu-fries.jpg";
import imgZinger from "@/assets/menu-zinger.jpg";
import imgWrap from "@/assets/menu-wrap.jpg";
import lifestyle from "@/assets/lifestyle.jpg";

const IMAGE_MAP: Record<string, string> = {
  burger: imgBurger,
  pizza: imgPizza,
  shawarma: imgShawarma,
  fries: imgFries,
  zinger: imgZinger,
  wrap: imgWrap,
};

function resolveImg(key: string) {
  return IMAGE_MAP[key] ?? imgBurger;
}

function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Punjab Fast Food — Taste the Real Flavor of Punjab" },
      { name: "description", content: "Premium Punjabi street-food: zinger burgers, tikka pizzas, shawarma wraps, masala fries. Order online." },
      { property: "og:title", content: "Punjab Fast Food — Taste the Real Flavor of Punjab" },
      { property: "og:description", content: "Premium Punjabi street-food: zinger burgers, tikka pizzas, shawarma wraps, masala fries. Order online." },
    ],
  }),
  component: Home,
});

const TESTIMONIALS = [
  { name: "Ayesha M.", quote: "The Zinger Punjab is unreal. Crispy, juicy, and that masala mayo — addictive.", rating: 5 },
  { name: "Rohan S.", quote: "Best tikka pizza I've had outside of Amritsar. The crust alone is worth it.", rating: 5 },
  { name: "Faisal K.", quote: "Friday night staple for the squad. Fast, fresh, and ridiculously flavorful.", rating: 5 },
];

const STATS = [
  { num: "120K+", label: "Orders Delivered" },
  { num: "4.9", label: "Customer Rating" },
  { num: "24h", label: "Marination Time" },
  { num: "100%", label: "Halal Certified" },
];

// ---------- Menu data hook ----------

function useMenuData() {
  const fetchMenu = useServerFn(getPublicMenu);
  return useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    staleTime: 60_000,
  });
}

// ---------- Cart (localStorage) ----------

const CART_KEY = "pff:cart2";
const PAST_KEY = "pff:past2";

function entryKey(menuItemId: string, variantId: string | null, addonIds: string[]) {
  return [menuItemId, variantId ?? "-", ...[...addonIds].sort()].join("|");
}

function readCart(key: string): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((e) => e && typeof e === "object" && typeof e.menuItemId === "string") as CartEntry[];
  } catch {
    return [];
  }
}

function writeCart(key: string, v: CartEntry[]) {
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("pff:storage"));
}

function addEntry(entry: Omit<CartEntry, "key">) {
  const key = entryKey(entry.menuItemId, entry.variantId, entry.addonIds);
  const cart = readCart(CART_KEY);
  const idx = cart.findIndex((e) => e.key === key);
  if (idx >= 0) {
    cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + entry.quantity };
  } else {
    cart.push({ ...entry, key });
  }
  writeCart(CART_KEY, cart);
}

function updateCartQty(key: string, delta: number) {
  const cart = readCart(CART_KEY);
  const idx = cart.findIndex((e) => e.key === key);
  if (idx < 0) return;
  const next = cart[idx].quantity + delta;
  if (next <= 0) cart.splice(idx, 1);
  else cart[idx] = { ...cart[idx], quantity: next };
  writeCart(CART_KEY, cart);
}

function removeCartEntry(key: string) {
  writeCart(CART_KEY, readCart(CART_KEY).filter((e) => e.key !== key));
}

function useCartState() {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [past, setPast] = useState<CartEntry[]>([]);
  useEffect(() => {
    const sync = () => {
      setCart(readCart(CART_KEY));
      setPast(readCart(PAST_KEY));
    };
    sync();
    window.addEventListener("pff:storage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pff:storage", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { cart, past, setCart, setPast };
}

// ---------- Page ----------

function Home() {
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white font-body text-brand-black selection:bg-brand-gold selection:text-brand-black overflow-x-hidden">
      <LoadingScreen />
      <Nav onOpenCart={() => setCartOpen(true)} />
      <Hero />
      <Marquee />
      <Menu />
      <Offers />
      <AiRecommendations />
      <Story />
      <Testimonials />
      <Gallery />
      <Contact />
      <Footer />
      <FloatingActions onOpenCart={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function LoadingScreen() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] bg-brand-black flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <Flame className="size-12 text-brand-orange mx-auto mb-4 animate-pulse" />
            <div className="font-display text-5xl uppercase tracking-tighter text-white">
              Punjab <span className="text-brand-gold">Fast Food</span>
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
              Firing up the tandoor…
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Nav({ onOpenCart }: { onOpenCart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { cart } = useCartState();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md border-b border-brand-black/5" : "bg-transparent"
      }`}
    >
      <a href="#" className={`font-display text-2xl tracking-tighter uppercase transition-colors ${scrolled ? "text-brand-red" : "text-white"}`}>
        Punjab<span className="text-brand-gold">.</span>Fast Food
      </a>
      <div className={`hidden md:flex gap-8 font-mono text-xs uppercase tracking-widest font-bold ${scrolled ? "text-brand-black" : "text-white"}`}>
        {["Menu", "Offers", "Story", "Contact"].map((l) => (
          <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-brand-orange transition-colors relative group">
            {l}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-brand-orange group-hover:w-full transition-all duration-300" />
          </a>
        ))}
      </div>
      <button
        onClick={onOpenCart}
        className="relative bg-brand-red text-white px-5 py-2.5 text-xs font-bold uppercase tracking-tighter hover:bg-brand-orange transition-all active:scale-95 flex items-center gap-2"
      >
        <ShoppingBag className="size-3.5" /> Cart
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 grid place-items-center bg-brand-gold text-brand-black font-mono text-[10px] font-bold rounded-full">
            {cartCount}
          </span>
        )}
      </button>
    </motion.nav>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen min-h-[700px] flex flex-col items-center justify-center overflow-hidden bg-brand-black text-white">
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        <img src={heroSpice} alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-black/40 via-transparent to-brand-black" />
      </motion.div>

      <div className="absolute top-1/4 left-10 size-24 bg-brand-orange rounded-full mix-blend-screen blur-3xl opacity-50 spice-float" />
      <div className="absolute bottom-1/4 right-20 size-40 bg-brand-red rounded-full mix-blend-screen blur-3xl opacity-40 spice-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/3 right-1/4 size-16 bg-brand-gold rounded-full mix-blend-screen blur-2xl opacity-30 spice-float" style={{ animationDelay: "4s" }} />

      <div className="relative z-10 text-center px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 border border-brand-gold/30 rounded-full font-mono text-[10px] uppercase tracking-[0.3em] text-brand-gold"
        >
          <span className="size-1.5 bg-brand-gold rounded-full animate-pulse" /> Now Serving Heat
        </motion.div>

        <h1 className="font-display text-[clamp(4rem,15vw,12rem)] leading-[0.85] uppercase tracking-tighter">
          {"Punjab".split("").map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
            >
              {c}
            </motion.span>
          ))}
          <br />
          <motion.span
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block text-brand-gold"
          >
            Fast Food
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.6 }}
          className="mt-8 font-mono text-xs md:text-base uppercase tracking-[0.4em] opacity-80"
        >
          Taste the Real Flavor of Punjab
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a href="#menu" className="group relative px-8 py-4 bg-brand-red text-white font-bold uppercase tracking-tighter overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">Order Now <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" /></span>
            <div className="absolute inset-0 bg-brand-orange translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a href="#menu" className="px-8 py-4 border border-white/30 hover:border-brand-gold hover:text-brand-gold font-bold uppercase tracking-tighter transition-all">
            View Menu
          </a>
          <a href="#contact" className="px-8 py-4 border border-white/30 hover:border-brand-gold hover:text-brand-gold font-bold uppercase tracking-tighter transition-all">
            Book Table
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 3.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50"
      >
        ↓ Scroll
      </motion.div>
    </section>
  );
}

function Marquee() {
  const text = "50% OFF FOR STUDENTS • BOGO MONDAYS • FREE LASSI WITH BURGERS • LATE NIGHT TILL 2AM • ";
  return (
    <div className="bg-brand-orange py-4 overflow-hidden border-y-2 border-brand-black">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="font-display text-2xl uppercase text-brand-black px-4">{text.repeat(4)}</span>
        <span className="font-display text-2xl uppercase text-brand-black px-4">{text.repeat(4)}</span>
      </div>
    </div>
  );
}

// ---------- Dynamic Menu ----------

function Menu() {
  const { data, isLoading, error } = useMenuData();
  const [cat, setCat] = useState<string>("All");
  const [modalItem, setModalItem] = useState<PublicMenuItem | null>(null);

  const categories = useMemo(() => {
    const fromDb = (data?.categories ?? []).map((c) => c.name);
    return ["All", ...fromDb];
  }, [data]);

  const items = data?.items ?? [];
  const filtered = cat === "All" ? items : items.filter((i) => i.category === cat);

  return (
    <section id="menu" className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6"
      >
        <div>
          <div className="font-mono text-brand-red text-xs font-bold uppercase tracking-[0.3em] mb-3">— The Lineup</div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none">
            World Class<br />
            <span className="text-brand-red">Desi Soul</span>
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto font-mono text-[10px] uppercase font-bold flex-shrink-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 transition-all whitespace-nowrap ${
                cat === c ? "bg-brand-black text-white" : "border border-brand-black/10 hover:border-brand-black"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-brand-black/50 font-mono text-xs uppercase tracking-widest">
          <Loader2 className="size-4 animate-spin mr-3" /> Loading menu…
        </div>
      )}
      {error && (
        <div className="text-center py-16 font-mono text-xs uppercase text-brand-red">
          Failed to load menu.
        </div>
      )}

      {!isLoading && !error && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-brand-black/5 border border-brand-black/5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <MenuCard key={item.id} item={item} index={i} onOpenOptions={() => setModalItem(item)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {modalItem && <OptionsModal item={modalItem} onClose={() => setModalItem(null)} />}
      </AnimatePresence>
    </section>
  );
}

function MenuCard({ item, index, onOpenOptions }: { item: PublicMenuItem; index: number; onOpenOptions: () => void }) {
  const hasVariants = item.variants.length > 0;
  const hasAddons = item.addons.length > 0;
  const needsOptions = hasVariants || hasAddons;

  const priceLabel = hasVariants
    ? `From ${formatPrice(Math.min(...item.variants.map((v) => v.price)))}`
    : formatPrice(item.price);

  const handleQuickAdd = () => {
    addEntry({
      menuItemId: item.id,
      name: item.name,
      variantId: null,
      variantName: null,
      addonIds: [],
      addonNames: [],
      unitPrice: item.price,
      quantity: 1,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className="group bg-white p-6 hover:bg-brand-gold transition-colors duration-500 relative"
    >
      {item.tag && (
        <div className={`absolute top-4 right-4 z-10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.tag.toLowerCase() === "hot" ? "bg-brand-red text-white" : "bg-brand-black text-brand-gold"}`}>
          {item.tag}
        </div>
      )}
      <div className="aspect-square mb-6 overflow-hidden bg-stone-100 ring-1 ring-black/5">
        <img
          src={resolveImg(item.imageKey)}
          alt={item.name}
          loading="lazy"
          width={640}
          height={640}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
      </div>
      <div className="flex justify-between items-start mb-2 gap-3">
        <h3 className="font-display text-2xl uppercase leading-none">{item.name}</h3>
        <span className="font-mono text-sm font-bold whitespace-nowrap">{priceLabel}</span>
      </div>
      <p className="text-xs text-brand-black/60 leading-relaxed mb-6">{item.description}</p>
      {needsOptions ? (
        <button
          onClick={onOpenOptions}
          className="w-full py-3 bg-brand-black text-white text-[10px] font-bold uppercase tracking-widest group-hover:bg-brand-red transition-colors flex items-center justify-center gap-2"
        >
          <Settings2 className="size-3" /> Select Options
        </button>
      ) : (
        <button
          onClick={handleQuickAdd}
          className="w-full py-3 bg-brand-black text-white text-[10px] font-bold uppercase tracking-widest group-hover:bg-brand-red transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="size-3" /> Add to Cart
        </button>
      )}
    </motion.div>
  );
}

function OptionsModal({ item, onClose }: { item: PublicMenuItem; onClose: () => void }) {
  const hasVariants = item.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(hasVariants ? item.variants[0].id : null);
  const [addonIds, setAddonIds] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const variant: MenuVariant | null = hasVariants
    ? item.variants.find((v) => v.id === variantId) ?? item.variants[0]
    : null;
  const selectedAddons: MenuAddon[] = item.addons.filter((a) => addonIds.has(a.id));

  const basePrice = variant ? variant.price : item.price;
  const addonsPrice = selectedAddons.reduce((s, a) => s + a.price, 0);
  const unitPrice = basePrice + addonsPrice;
  const total = unitPrice * qty;

  const toggleAddon = (id: string) => {
    setAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const chosenAddons = selectedAddons;
    const displayName = variant ? `${item.name} · ${variant.name}` : item.name;
    addEntry({
      menuItemId: item.id,
      name: displayName,
      variantId: variant ? variant.id : null,
      variantName: variant ? variant.name : null,
      addonIds: chosenAddons.map((a) => a.id),
      addonNames: chosenAddons.map((a) => a.name),
      unitPrice,
      quantity: qty,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-brand-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-white max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-9 grid place-items-center bg-brand-black text-white hover:bg-brand-red transition-colors z-10"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="aspect-[16/9] overflow-hidden bg-stone-100">
          <img src={resolveImg(item.imageKey)} alt={item.name} className="w-full h-full object-cover" />
        </div>

        <div className="p-6 md:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-red mb-2">{item.category}</div>
          <h3 className="font-display text-4xl uppercase tracking-tighter leading-none mb-3">{item.name}</h3>
          <p className="text-sm text-brand-black/60 leading-relaxed mb-6">{item.description}</p>

          {hasVariants && (
            <div className="mb-6">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-3">Choose Size</div>
              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v) => {
                  const active = variant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      className={`p-3 text-left border transition-colors ${
                        active
                          ? "border-brand-red bg-brand-red text-white"
                          : "border-brand-black/10 hover:border-brand-black"
                      }`}
                    >
                      <div className="font-bold uppercase text-sm tracking-tighter">{v.name}</div>
                      <div className={`font-mono text-xs mt-1 ${active ? "text-white/80" : "text-brand-black/60"}`}>
                        {formatPrice(v.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {item.addons.length > 0 && (
            <div className="mb-6">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mb-3">Add-ons (optional)</div>
              <div className="space-y-2">
                {item.addons.map((a) => {
                  const active = addonIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      className={`w-full flex items-center justify-between p-3 border transition-colors text-left ${
                        active
                          ? "border-brand-black bg-brand-black text-white"
                          : "border-brand-black/10 hover:border-brand-black"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`size-4 grid place-items-center border ${active ? "border-brand-gold bg-brand-gold text-brand-black" : "border-brand-black/30"}`}>
                          {active && <Check className="size-3" />}
                        </span>
                        <span className="font-medium text-sm">{a.name}</span>
                      </div>
                      <span className={`font-mono text-xs font-bold ${active ? "text-brand-gold" : "text-brand-black/60"}`}>
                        +{formatPrice(a.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-brand-black/10 pt-6 mb-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">Quantity</div>
            <div className="flex items-center border border-brand-black/10">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="size-10 grid place-items-center hover:bg-brand-black hover:text-white transition-colors"
                aria-label="Decrease"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-12 text-center font-mono font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(50, q + 1))}
                className="size-10 grid place-items-center hover:bg-brand-black hover:text-white transition-colors"
                aria-label="Increase"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full py-4 bg-brand-red text-white font-bold uppercase tracking-tighter text-sm hover:bg-brand-black transition-colors flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-2"><Plus className="size-4" /> Add to Cart</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Offers() {
  return (
    <section id="offers" className="bg-brand-black text-white py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="font-mono text-brand-gold text-xs font-bold uppercase tracking-[0.3em] mb-3">— Limited Time</div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter">
            Smoking <span className="text-brand-orange">Hot Deals</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Family Combo", price: "$24.99", was: "$38", desc: "4 Zingers · 2 Masala Fries · 1.5L Drink", color: "bg-brand-red" },
            { title: "Tikka Tuesday", price: "$9.99", was: "$15", desc: "Full Tikka Pizza + Garlic Sauce", color: "bg-brand-orange text-brand-black" },
            { title: "Late Night", price: "$5.50", was: "$9", desc: "Any wrap + drink, after 11pm", color: "bg-brand-gold text-brand-black" },
          ].map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8, rotate: -1 }}
              className={`${d.color} p-8 relative overflow-hidden group`}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-70 mb-2">Deal #{i + 1}</div>
              <h3 className="font-display text-4xl uppercase tracking-tighter mb-4">{d.title}</h3>
              <p className="text-sm opacity-80 mb-6">{d.desc}</p>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-display text-5xl">{d.price}</span>
                <span className="line-through opacity-50 text-sm">{d.was}</span>
              </div>
              <Countdown />
              <button className="mt-6 w-full py-3 bg-brand-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-brand-black transition-colors">
                Claim Offer
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Countdown() {
  const [t, setT] = useState({ h: 4, m: 22, s: 45 });
  useEffect(() => {
    const i = setInterval(() => {
      setT((p) => {
        let s = p.s - 1, m = p.m, h = p.h;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="flex gap-2 font-mono text-xs uppercase">
      <div className="bg-black/20 px-3 py-2 min-w-[48px] text-center"><div className="font-bold text-base">{String(t.h).padStart(2, "0")}</div><div className="text-[8px] opacity-60">Hrs</div></div>
      <div className="bg-black/20 px-3 py-2 min-w-[48px] text-center"><div className="font-bold text-base">{String(t.m).padStart(2, "0")}</div><div className="text-[8px] opacity-60">Min</div></div>
      <div className="bg-black/20 px-3 py-2 min-w-[48px] text-center"><div className="font-bold text-base">{String(t.s).padStart(2, "0")}</div><div className="text-[8px] opacity-60">Sec</div></div>
    </div>
  );
}

function Counter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const numeric = parseFloat(value.replace(/[^\d.]/g, ""));
  const isNumeric = !isNaN(numeric) && !value.includes("%") && !value.includes("h");
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);

  useEffect(() => {
    if (!isNumeric || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const dur = 1500;
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          start = numeric * eased;
          setDisplay(value.replace(/[\d.,]+/, Math.floor(start).toLocaleString()));
          if (p < 1) requestAnimationFrame(step);
          else setDisplay(value);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, numeric, isNumeric]);

  return <span ref={ref}>{display}{suffix}</span>;
}

function Story() {
  return (
    <section id="story" className="bg-brand-cream py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="font-mono text-brand-red text-xs font-bold uppercase tracking-[0.3em] mb-3">— Our Story</div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9] mb-8">
            From the<br />
            <span className="text-brand-orange">GT Road</span><br />
            to your block
          </h2>
          <p className="text-brand-black/70 leading-relaxed mb-6">
            What started as a single roadside dhaba outside Amritsar is now a movement. We bring the same recipes, the same spice grinders, the same fire — and deliver it with the speed your weeknight deserves.
          </p>
          <p className="text-brand-black/70 leading-relaxed mb-10">
            Every patty hand-pressed. Every sauce ground daily. Every spice sourced direct from the Punjab heartlands. No shortcuts. No apologies.
          </p>
          <button className="px-8 py-4 bg-brand-black text-white font-bold uppercase tracking-tighter text-sm hover:bg-brand-red transition-colors">
            Read Full Story
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white p-8 border border-brand-black/5 hover:bg-brand-black hover:text-white transition-colors group"
            >
              <div className="font-display text-5xl md:text-6xl tracking-tighter text-brand-red group-hover:text-brand-gold">
                <Counter value={s.num} />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setIdx((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <section className="py-24 md:py-32 px-6 bg-brand-black text-white overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <div className="font-mono text-brand-gold text-xs font-bold uppercase tracking-[0.3em] mb-3">— Real Talk</div>
        <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter mb-16">
          The <span className="text-brand-orange">Hype</span> is Real
        </h2>

        <div className="relative h-64">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: TESTIMONIALS[idx].rating }).map((_, i) => (
                  <Star key={i} className="size-5 fill-brand-gold text-brand-gold" />
                ))}
              </div>
              <p className="font-display text-2xl md:text-4xl uppercase tracking-tight leading-tight mb-8">
                "{TESTIMONIALS[idx].quote}"
              </p>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-brand-gold">
                — {TESTIMONIALS[idx].name}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-2 justify-center mt-8">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1 transition-all ${idx === i ? "w-12 bg-brand-orange" : "w-6 bg-white/20"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section className="bg-brand-red py-24 px-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-8"
          >
            <div className="relative overflow-hidden group">
              <img src={lifestyle} alt="Street vibes" loading="lazy" width={1216} height={800} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.3em]">
                — Friday night, downtown
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4 flex flex-col justify-center"
          >
            <h2 className="font-display text-5xl uppercase tracking-tighter mb-6 leading-[0.9]">
              Freshness <br />
              <span className="text-brand-gold underline decoration-4 underline-offset-4">Guaranteed</span>
            </h2>
            <p className="font-mono text-xs opacity-80 uppercase tracking-widest leading-loose mb-10">
              We don't do pre-packed. Every patty hand-pressed, every sauce ground daily.
            </p>
            <div className="grid grid-cols-2 gap-8 border-t border-white/20 pt-8">
              <div>
                <div className="font-display text-4xl">100%</div>
                <div className="font-mono text-[10px] uppercase opacity-60">Halal</div>
              </div>
              <div>
                <div className="font-display text-4xl">24h</div>
                <div className="font-mono text-[10px] uppercase opacity-60">Marination</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-24 md:py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="font-mono text-brand-red text-xs font-bold uppercase tracking-[0.3em] mb-3">— Get in Touch</div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-[0.9] mb-10">
            Book a<br />
            <span className="text-brand-orange">table</span>
          </h2>

          <div className="space-y-6 mb-10">
            <div className="flex items-start gap-4">
              <MapPin className="size-5 text-brand-red mt-0.5" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-brand-black/40 mb-1">Location</div>
                <div className="font-medium">123 Spice Route, Downtown</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="size-5 text-brand-red mt-0.5" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-brand-black/40 mb-1">Phone</div>
                <div className="font-medium">+1 (234) 567 890</div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="size-5 text-brand-red mt-0.5" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-brand-black/40 mb-1">Hours</div>
                <div className="font-medium">Daily · 11am to 2am</div>
              </div>
            </div>
          </div>

          <a
            href={waUrl(`Hi ${RESTAURANT_NAME}, I'd like to make an enquiry.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-4 bg-green-600 text-white font-bold uppercase tracking-tighter text-sm hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="size-4" /> Chat on WhatsApp
          </a>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          onSubmit={(e) => e.preventDefault()}
          className="bg-brand-cream p-8 md:p-10 space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Name" className="bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors" />
            <input placeholder="Phone" className="bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors" />
          </div>
          <input placeholder="Email" type="email" className="w-full bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors" />
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Date" type="date" className="bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors" />
            <input placeholder="Guests" type="number" defaultValue={2} className="bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors" />
          </div>
          <textarea placeholder="Special requests" rows={4} className="w-full bg-white px-4 py-4 font-mono text-sm placeholder:text-brand-black/30 border border-brand-black/5 focus:border-brand-red outline-none transition-colors resize-none" />
          <button className="w-full py-4 bg-brand-red text-white font-bold uppercase tracking-tighter text-sm hover:bg-brand-black transition-colors">
            Reserve My Spot
          </button>
        </motion.form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-black text-white py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="md:w-1/3">
          <div className="font-display text-3xl uppercase tracking-tighter text-brand-red mb-6">
            Punjab<span className="text-brand-gold">.</span>Fast Food
          </div>
          <p className="text-sm text-white/50 leading-relaxed mb-8">
            Bringing the energetic spirit of the Grand Trunk Road to your neighborhood. Fast food, real soul.
          </p>
          <div className="flex gap-3">
            {[
              { Icon: Instagram, href: "#" },
              { Icon: Facebook, href: "#" },
              { Icon: MessageCircle, href: waUrl(`Hi ${RESTAURANT_NAME}!`) },
            ].map(({ Icon, href }, i) => (
              <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="size-10 rounded-full border border-white/20 grid place-items-center hover:bg-brand-red hover:border-brand-red transition-colors">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div>
            <h4 className="font-mono text-xs uppercase font-bold text-brand-gold mb-6">Explore</h4>
            <ul className="space-y-3 text-sm text-white/40 font-bold uppercase tracking-tighter">
              <li><a href="#story" className="hover:text-white transition-colors">Our Story</a></li>
              <li><a href="#menu" className="hover:text-white transition-colors">Menu</a></li>
              <li><a href="#offers" className="hover:text-white transition-colors">Offers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase font-bold text-brand-gold mb-6">Contact</h4>
            <ul className="space-y-3 text-sm text-white/40">
              <li className="flex items-center gap-2"><MapPin className="size-3" /> 123 Spice Route</li>
              <li className="flex items-center gap-2"><Phone className="size-3" /> +1 234 567 890</li>
              <li className="flex items-center gap-2"><Mail className="size-3" /> hello@punjabff.com</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
        <p>© 2026 Punjab Fast Food. All Rights Reserved.</p>
        <p>Designed for Flavor.</p>
      </div>
    </footer>
  );
}

// ---------- AI Recommendations ----------

type Pick = { name: string; reason: string };

function AiRecommendations() {
  const { cart, past } = useCartState();
  const { data: menu } = useMenuData();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recommend = useServerFn(recommendDishes);

  const menuItems = menu?.items ?? [];
  const menuNames = menuItems.map((m) => m.name);

  const getPicks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommend({
        data: {
          cart: cart.map((c) => c.name),
          pastOrders: past.map((c) => c.name),
          menu: menuNames,
        },
      });
      setPicks(result.picks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [cart, past, menuNames, recommend]);

  const moveCartToPast = () => {
    const merged = [...past];
    for (const c of cart) {
      if (!merged.find((m) => m.key === c.key)) merged.push(c);
    }
    writeCart(PAST_KEY, merged.slice(-30));
    writeCart(CART_KEY, []);
  };
  const removeFromCart = (k: string) => writeCart(CART_KEY, cart.filter((x) => x.key !== k));
  const removeFromPast = (k: string) => writeCart(PAST_KEY, past.filter((x) => x.key !== k));
  const lookupByName = (n: string) => menuItems.find((m) => m.name === n);

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  return (
    <section id="ai" className="relative py-24 md:py-32 px-6 bg-gradient-to-b from-white via-brand-cream to-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #C8102E 1px, transparent 1px), radial-gradient(circle at 80% 60%, #F39200 1px, transparent 1px)", backgroundSize: "40px 40px, 60px 60px" }} />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="font-mono text-brand-red text-xs font-bold uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
            <Sparkles className="size-3" /> — AI Chef's Picks
          </div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none">
            Made <span className="text-brand-red">For You</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-brand-black/60 max-w-xl mx-auto">
            Our AI chef studies your cart and past orders to suggest the dishes you'll obsess over next.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <CartPanel
            title={`Your Cart · ${formatPrice(cartTotal)}`}
            empty="Add items from the menu above to personalize your picks."
            items={cart}
            onRemove={removeFromCart}
            accent="bg-brand-red"
          />
          <CartPanel
            title="Past Orders"
            empty="No order history yet — try a few items then mark them as ordered."
            items={past}
            onRemove={removeFromPast}
            accent="bg-brand-gold text-brand-black"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <button
            onClick={getPicks}
            disabled={loading || menuNames.length === 0}
            className="group relative px-8 py-4 bg-brand-black text-white font-bold uppercase tracking-tighter overflow-hidden disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Cooking up picks…" : "Get AI Recommendations"}
          </button>
          {cart.length > 0 && (
            <button
              onClick={moveCartToPast}
              className="px-6 py-4 border border-brand-black/20 hover:border-brand-black font-bold uppercase tracking-tighter text-xs flex items-center justify-center gap-2"
            >
              <Check className="size-4" /> Mark Cart as Ordered
            </button>
          )}
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-8 p-4 border border-brand-red/30 bg-brand-red/5 text-brand-red text-sm font-mono text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {picks.length > 0 && (
            <motion.div
              key="picks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-3 gap-4"
            >
              {picks.map((p, i) => {
                const item = lookupByName(p.name);
                const priceLabel = item
                  ? item.variants.length > 0
                    ? `From ${formatPrice(Math.min(...item.variants.map((v) => v.price)))}`
                    : formatPrice(item.price)
                  : "";
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative bg-white border border-brand-black/10 hover:border-brand-red transition-colors overflow-hidden"
                  >
                    <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-brand-black text-brand-gold text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="size-2.5" /> AI Pick
                    </div>
                    {item && (
                      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                        <img src={resolveImg(item.imageKey)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <h3 className="font-display text-2xl uppercase leading-none">{p.name}</h3>
                        {item && <span className="font-mono text-sm font-bold whitespace-nowrap">{priceLabel}</span>}
                      </div>
                      <p className="text-xs text-brand-black/60 leading-relaxed mb-5 italic">"{p.reason}"</p>
                      {item && (
                        <button
                          onClick={() => {
                            if (item.variants.length > 0 || item.addons.length > 0) {
                              // Scroll to menu — user will pick options there
                              document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                            } else {
                              addEntry({
                                menuItemId: item.id,
                                name: item.name,
                                variantId: null,
                                variantName: null,
                                addonIds: [],
                                addonNames: [],
                                unitPrice: item.price,
                                quantity: 1,
                              });
                            }
                          }}
                          className="w-full py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-black transition-colors flex items-center justify-center gap-2"
                        >
                          {item.variants.length > 0 || item.addons.length > 0 ? (
                            <><Settings2 className="size-3" /> Select Options</>
                          ) : (
                            <><Plus className="size-3" /> Add to Cart</>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function CartPanel({ title, empty, items, onRemove, accent }: { title: string; empty: string; items: CartEntry[]; onRemove: (k: string) => void; accent: string }) {
  return (
    <div className="border border-brand-black/10 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">{title}</h3>
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 text-white ${accent}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-brand-black/50 leading-relaxed">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((e) => {
            const label = e.addonNames.length > 0 ? `${e.name} + ${e.addonNames.join(", ")}` : e.name;
            return (
              <span key={e.key} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-brand-black/5 text-xs font-medium">
                <span className="font-mono text-[10px] font-bold text-brand-red">×{e.quantity}</span>
                {label}
                <span className="font-mono text-[10px] text-brand-black/50">{formatPrice(e.unitPrice * e.quantity)}</span>
                <button onClick={() => onRemove(e.key)} className="size-5 grid place-items-center rounded-full hover:bg-brand-red hover:text-white transition-colors" aria-label={`Remove ${e.name}`}>
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Floating actions (cart + WhatsApp) ----------

function FloatingActions({ onOpenCart }: { onOpenCart: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { cart } = useCartState();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const count = cart.reduce((s, c) => s + c.quantity, 0);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      <a
        href={waUrl(`Hi ${RESTAURANT_NAME}, I'd like to place an order.`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="size-14 rounded-full bg-green-600 hover:bg-green-500 text-white grid place-items-center shadow-2xl active:scale-95 transition-all"
      >
        <MessageCircle className="size-6" />
      </a>
      <button
        onClick={onOpenCart}
        aria-label="Open cart"
        className="relative size-14 rounded-full bg-brand-red hover:bg-brand-orange text-white grid place-items-center shadow-2xl active:scale-95 transition-all"
      >
        <ShoppingBag className="size-6" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 grid place-items-center bg-brand-gold text-brand-black font-mono text-xs font-bold rounded-full">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

// ---------- Cart drawer + checkout ----------

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart } = useCartState();
  const settings = useSettings();
  const submitOrder = useServerFn(createCustomerOrder);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Ensure an auth session exists (anonymous is fine) so createCustomerOrder can persist.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          await supabase.auth.signInAnonymously();
        }
      } catch (err) {
        console.warn("[cart] anonymous sign-in failed", err);
      }
    })();
  }, [open]);

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const delivery = cart.length > 0 ? settings.deliveryCharges : 0;
  const total = subtotal + delivery;

  const handleOrder = async () => {
    setFormError(null);
    if (cart.length === 0) return setFormError("Your cart is empty.");
    if (!name.trim()) return setFormError("Please enter your name.");
    if (!phone.trim()) return setFormError("Please enter your phone number.");
    if (!address.trim()) return setFormError("Please enter your delivery address.");

    setSubmitting(true);
    let orderId: string | null = null;

    // Persist order to Supabase before opening WhatsApp. Never block the WA flow on failure.
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) await supabase.auth.signInAnonymously();
      const result = await submitOrder({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          notes: [address.trim() ? `Address: ${address.trim()}` : "", notes.trim()].filter(Boolean).join(" | ") || null,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId ?? undefined,
            addonIds: c.addonIds,
            quantity: c.quantity,
          })),
        },
      });
      orderId = result?.id ?? null;
    } catch (err) {
      console.warn("[cart] order persistence failed, continuing to WhatsApp", err);
    }

    const msg = buildOrderMessage(
      cart,
      { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() },
      { subtotal, delivery, total },
      { restaurantName: settings.restaurantName, orderId },
    );
    window.open(buildWaUrl(settings.whatsappNumber, msg), "_blank", "noopener,noreferrer");
    setSubmitting(false);
  };


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] bg-brand-black/60 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-black/10">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-red">Your Cart</div>
                <div className="font-display text-2xl uppercase tracking-tighter">{cart.length} item{cart.length === 1 ? "" : "s"}</div>
              </div>
              <button onClick={onClose} className="size-9 grid place-items-center bg-brand-black text-white hover:bg-brand-red transition-colors" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="size-10 text-brand-black/20 mx-auto mb-4" />
                  <p className="font-mono text-xs uppercase tracking-widest text-brand-black/50">Cart is empty</p>
                  <button onClick={onClose} className="mt-6 px-6 py-3 bg-brand-red text-white font-bold uppercase text-xs tracking-tighter hover:bg-brand-black transition-colors">
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((e) => (
                    <div key={e.key} className="border border-brand-black/10 p-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{e.name}</div>
                          {e.addonNames.length > 0 && (
                            <div className="font-mono text-[10px] uppercase text-brand-black/50 mt-1">+ {e.addonNames.join(", ")}</div>
                          )}
                          <div className="font-mono text-xs text-brand-black/60 mt-1">{formatPrice(e.unitPrice)} each</div>
                        </div>
                        <button onClick={() => removeCartEntry(e.key)} aria-label="Remove" className="text-brand-black/40 hover:text-brand-red">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-brand-black/10">
                          <button onClick={() => updateCartQty(e.key, -1)} className="size-8 grid place-items-center hover:bg-brand-black hover:text-white transition-colors" aria-label="Decrease"><Minus className="size-3" /></button>
                          <span className="w-10 text-center font-mono font-bold text-sm">{e.quantity}</span>
                          <button onClick={() => updateCartQty(e.key, 1)} className="size-8 grid place-items-center hover:bg-brand-black hover:text-white transition-colors" aria-label="Increase"><Plus className="size-3" /></button>
                        </div>
                        <div className="font-mono font-bold text-sm">{formatPrice(e.unitPrice * e.quantity)}</div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 mt-4 border-t border-brand-black/10 space-y-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-black/50">Delivery Details</div>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name *" className="w-full border border-brand-black/10 px-4 py-3 text-sm outline-none focus:border-brand-red transition-colors" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number *" type="tel" className="w-full border border-brand-black/10 px-4 py-3 text-sm outline-none focus:border-brand-red transition-colors" />
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery Address *" rows={2} className="w-full border border-brand-black/10 px-4 py-3 text-sm outline-none focus:border-brand-red transition-colors resize-none" />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full border border-brand-black/10 px-4 py-3 text-sm outline-none focus:border-brand-red transition-colors resize-none" />
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-brand-black/10 px-6 py-4 space-y-2 bg-brand-cream">
                <div className="flex justify-between text-sm"><span className="text-brand-black/60">Subtotal</span><span className="font-mono font-bold">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-brand-black/60">Delivery</span><span className="font-mono font-bold">{formatPrice(delivery)}</span></div>
                <div className="flex justify-between items-baseline pt-2 border-t border-brand-black/10">
                  <span className="font-display text-xl uppercase tracking-tighter">Total</span>
                  <span className="font-display text-3xl tracking-tighter text-brand-red">{formatPrice(total)}</span>
                </div>
                {formError && <div className="text-xs text-brand-red font-mono">{formError}</div>}
                <button
                  onClick={handleOrder}
                  disabled={submitting}
                  className="w-full mt-2 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold uppercase tracking-tighter text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />} {submitting ? "Placing order…" : "Order on WhatsApp"}
                </button>

                <p className="text-[10px] font-mono uppercase tracking-widest text-brand-black/40 text-center">Opens WhatsApp with your order</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

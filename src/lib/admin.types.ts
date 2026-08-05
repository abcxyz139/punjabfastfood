import type { Availability, ProductType } from "./menu.types";

export type AdminMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageKey: string;
  /** Product page web address. */
  slug: string;
  galleryKeys: string[];
  videoUrl: string;
  tag: string | null;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  productType: ProductType;
  variantLabel: string | null;
  addonLabel: string | null;
  variantRequired: boolean;
  maxAddons: number | null;
  badges: string[];
  searchKeywords: string[];
  spiceLevel: number;
  inStock: boolean;
  availability: Availability;
  prepTimeMinutes: number | null;
  recommendedIds: string[];
  frequentlyBoughtIds: string[];
  mealUpgradeIds: string[];
  mealUpgradeLabel: string;
};



export type AdminOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    menuItemId: string;
    name: string;
    variantId: string | null;
    variantName: string | null;
    addons: Array<{ id: string; name: string; price: number }>;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    notes?: string | null;
  }>;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  defaultProductType: ProductType;
  variantLabel: string;
  addonLabel: string;
  /** One-tap ordering default for products in this category. */
  quickAdd: boolean;
  /** Pre-enable meal upgrade upsells for new products here. */
  mealUpgradeDefault: boolean;
};


export type AdminVariant = {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  available: boolean;
  displayOrder: number;
};

export type AdminAddon = {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  available: boolean;
  displayOrder: number;
};

export type AdminOffer = {
  id: string;
  title: string;
  description: string;
  imageKey: string;
  discountLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  displayOrder: number;
};

export type AdminGalleryImage = {
  id: string;
  imageKey: string;
  caption: string | null;
  displayOrder: number;
  active: boolean;
};

export type AdminTestimonial = {
  id: string;
  customerName: string;
  rating: number;
  review: string;
  imageKey: string | null;
  active: boolean;
  displayOrder: number;
};

export type AdminHero = {
  heading: string;
  subheading: string;
  ctaText: string;
  backgroundKey: string;
  bannerKey: string;
};

export type AdminBusinessSettings = {
  restaurantName: string;
  logoKey: string;
  phone: string;
  phoneSecondary: string;
  whatsappNumber: string;
  email: string;
  address: string;
  mapsUrl: string;
  hours: Array<{ day: string; open: string; close: string }>;
  deliveryCharges: number;
  minOrder: number;
  deliveryRadiusKm: number;
  isOpen: boolean;
  closedMessage: string;
  announcement: string;
  announcementActive: boolean;
  social: { instagram?: string; facebook?: string; tiktok?: string };
};

export type AdminDashboardSnapshot = {
  isAdmin: boolean;
  menuItems: AdminMenuItem[];
  orders: AdminOrder[];
  categories: AdminCategory[];
  variants: AdminVariant[];
  addons: AdminAddon[];
  offers: AdminOffer[];
  gallery: AdminGalleryImage[];
  testimonials: AdminTestimonial[];
  hero: AdminHero;
  settings: AdminBusinessSettings;
};

export type ProductType = "simple" | "variable" | "combo";

/** Owner-selectable marketing badges shown on product cards. */
export const BADGE_OPTIONS = [
  "Best Seller",
  "Popular",
  "Chef Choice",
  "Customer Favourite",
  "New",
  "Limited Time",
  "Spicy",
  "Healthy",
  "Kids Favourite",
  "Family Deal",
  "Owner Recommended",
] as const;

export type ProductBadge = (typeof BADGE_OPTIONS)[number];

/** Optional serving window: empty days = every day, null times = all day. */
export type Availability = {
  /** 0 = Sunday … 6 = Saturday. Empty means every day. */
  days: number[];
  /** "HH:MM" local time, or null for no lower bound. */
  from: string | null;
  /** "HH:MM" local time, or null for no upper bound. */
  until: string | null;
};


export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  defaultProductType: ProductType;
  variantLabel: string;
  addonLabel: string;
};


export type MenuVariant = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  displayOrder: number;
};

export type MenuAddon = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  displayOrder: number;
};

export type PublicMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageKey: string;
  tag: string | null;
  category: string;
  categoryId: string | null;
  displayOrder: number;
  featured: boolean;
  productType: ProductType;
  /** Label for the variant group, e.g. "Choose Size", "Pieces", "Flavour". */
  variantLabel: string;
  /** Label for the add-on group, e.g. "Add-ons", "Sauces", "Toppings". */
  addonLabel: string;
  /** When false the customer may add the item without picking a variant. */
  variantRequired: boolean;
  /** Maximum add-ons a customer may pick; null = unlimited. */
  maxAddons: number | null;
  /** Marketing badges shown on the card. */
  badges: string[];
  /** Extra searchable keywords/ingredients. */
  searchKeywords: string[];
  /** 0 = not spicy, 3 = very spicy. */
  spiceLevel: number;
  /** False = sold out; card shows as unavailable. */
  inStock: boolean;
  availability: Availability;
  variants: MenuVariant[];
  addons: MenuAddon[];
};



export type PublicMenuSnapshot = {
  categories: MenuCategory[];
  items: PublicMenuItem[];
};

export type CartEntry = {
  key: string;
  menuItemId: string;
  name: string;
  variantId: string | null;
  variantName: string | null;
  addonIds: string[];
  addonNames: string[];
  unitPrice: number;
  quantity: number;
};

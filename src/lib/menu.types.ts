export type ProductType = "simple" | "variable" | "combo";

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

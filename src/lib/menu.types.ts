export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
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

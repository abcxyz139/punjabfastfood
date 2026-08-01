import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PublicMenuSnapshot, PublicMenuItem, ProductType } from "./menu.types";

export type PublicSettings = {
  restaurantName: string;
  whatsappNumber: string;
  deliveryCharges: number;
  minOrder: number;
};

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getPublicSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSettings> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("restaurant_name, whatsapp_number, delivery_charges, min_order")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      restaurantName: data?.restaurant_name ?? "Punjab Fast Food",
      whatsappNumber: data?.whatsapp_number ?? "923017160216",
      deliveryCharges: Number(data?.delivery_charges ?? 2.5),
      minOrder: Number(data?.min_order ?? 0),
    };
  },
);


export const getPublicMenu = createServerFn({ method: "GET" }).handler(async (): Promise<PublicMenuSnapshot> => {
  const supabase = publicClient();

  const [catsRes, itemsRes, variantsRes, addonsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,display_order,active,default_product_type,variant_label,addon_label")
      .eq("active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select(
        "id,name,description,price,image_key,tag,category,category_id,display_order,featured,product_type,variant_label,addon_label,variant_required,max_addons,badges,search_keywords,spice_level,in_stock,available_days,available_from,available_until",
      )

      .eq("active", true)
      .order("display_order", { ascending: true }),

    supabase
      .from("menu_item_variants")
      .select("id,menu_item_id,name,price,available,display_order")
      .eq("available", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("menu_item_addons")
      .select("id,menu_item_id,name,price,available,display_order")
      .eq("available", true)
      .order("display_order", { ascending: true }),
  ]);

  if (catsRes.error) throw new Error(catsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (variantsRes.error) throw new Error(variantsRes.error.message);
  if (addonsRes.error) throw new Error(addonsRes.error.message);

  const variantsByItem = new Map<string, PublicMenuItem["variants"]>();
  for (const v of variantsRes.data ?? []) {
    const list = variantsByItem.get(v.menu_item_id) ?? [];
    list.push({
      id: v.id,
      name: v.name,
      price: Number(v.price),
      available: v.available,
      displayOrder: v.display_order,
    });
    variantsByItem.set(v.menu_item_id, list);
  }

  const addonsByItem = new Map<string, PublicMenuItem["addons"]>();
  for (const a of addonsRes.data ?? []) {
    const list = addonsByItem.get(a.menu_item_id) ?? [];
    list.push({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      available: a.available,
      displayOrder: a.display_order,
    });
    addonsByItem.set(a.menu_item_id, list);
  }

  const categories: PublicMenuSnapshot["categories"] = (catsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    displayOrder: c.display_order,
    active: c.active,
    defaultProductType: (c.default_product_type ?? "simple") as ProductType,
    variantLabel: c.variant_label ?? "Choose an option",
    addonLabel: c.addon_label ?? "Add-ons",
  }));

  const catById = new Map(categories.map((c) => [c.id, c]));
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  return {
    categories,
    items: (itemsRes.data ?? []).map((i) => {
      const cat = (i.category_id ? catById.get(i.category_id) : undefined) ?? catByName.get(i.category.toLowerCase());
      return {
        id: i.id,
        name: i.name,
        description: i.description,
        price: Number(i.price),
        imageKey: i.image_key,
        tag: i.tag,
        category: i.category,
        categoryId: i.category_id,
        displayOrder: i.display_order,
        featured: i.featured,
        productType: (i.product_type ?? cat?.defaultProductType ?? "simple") as ProductType,
        // Per-item label wins, otherwise the category default.
        variantLabel: i.variant_label || cat?.variantLabel || "Choose an option",
        addonLabel: i.addon_label || cat?.addonLabel || "Add-ons",
        variantRequired: i.variant_required ?? true,
        maxAddons: i.max_addons ?? null,
        badges: i.badges ?? [],
        searchKeywords: i.search_keywords ?? [],
        spiceLevel: i.spice_level ?? 0,
        inStock: i.in_stock ?? true,
        availability: {
          days: i.available_days ?? [],
          // Postgres time comes back as "HH:MM:SS" — trim to HH:MM.
          from: i.available_from ? String(i.available_from).slice(0, 5) : null,
          until: i.available_until ? String(i.available_until).slice(0, 5) : null,
        },
        variants: variantsByItem.get(i.id) ?? [],
        addons: addonsByItem.get(i.id) ?? [],

      };
    }),
  };

});

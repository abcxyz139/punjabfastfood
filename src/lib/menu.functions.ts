import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PublicMenuSnapshot, PublicMenuItem } from "./menu.types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getPublicMenu = createServerFn({ method: "GET" }).handler(async (): Promise<PublicMenuSnapshot> => {
  const supabase = publicClient();

  const [catsRes, itemsRes, variantsRes, addonsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,display_order,active")
      .eq("active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id,name,description,price,image_key,tag,category,category_id,display_order,featured")
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

  return {
    categories: (catsRes.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      displayOrder: c.display_order,
      active: c.active,
    })),
    items: (itemsRes.data ?? []).map((i) => ({
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
      variants: variantsByItem.get(i.id) ?? [],
      addons: addonsByItem.get(i.id) ?? [],
    })),
  };
});

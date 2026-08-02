import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AdminMenuItem,
  AdminOrder,
  AdminDashboardSnapshot,
  AdminCategory,
  AdminVariant,
  AdminAddon,
  AdminOffer,
  AdminGalleryImage,
  AdminTestimonial,
  AdminHero,
  AdminBusinessSettings,
} from "./admin.types";

type CloudClient = SupabaseClient<Database>;

const DEFAULT_HERO: AdminHero = {
  heading: "",
  subheading: "",
  ctaText: "Order Now",
  backgroundKey: "",
  bannerKey: "",
};

const DEFAULT_SETTINGS: AdminBusinessSettings = {
  restaurantName: "Punjab Fast Food",
  logoKey: "",
  phone: "",
  phoneSecondary: "",
  whatsappNumber: "923017160216",
  email: "",
  address: "",
  mapsUrl: "",
  hours: [],
  deliveryCharges: 0,
  minOrder: 0,
  deliveryRadiusKm: 0,
  isOpen: true,
  closedMessage: "",
  announcement: "",
  announcementActive: false,
  social: {},
};

export async function isCurrentUserAdmin(supabase: CloudClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function requireAdmin(supabase: CloudClient, userId: string) {
  const admin = await isCurrentUserAdmin(supabase, userId);
  if (!admin) throw new Error("Admin access required");
}

export async function loadAdminDashboard(
  supabase: CloudClient,
  userId: string,
): Promise<AdminDashboardSnapshot> {
  const admin = await isCurrentUserAdmin(supabase, userId);
  if (!admin) {
    return {
      isAdmin: false,
      menuItems: [] as AdminMenuItem[],
      orders: [] as AdminOrder[],
      categories: [] as AdminCategory[],
      variants: [] as AdminVariant[],
      addons: [] as AdminAddon[],
      offers: [] as AdminOffer[],
      gallery: [] as AdminGalleryImage[],
      testimonials: [] as AdminTestimonial[],
      hero: DEFAULT_HERO,
      settings: DEFAULT_SETTINGS,
    };
  }

  const [
    menuResult,
    orderResult,
    catResult,
    variantResult,
    addonResult,
    offerResult,
    galleryResult,
    testResult,
    heroResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "id,name,category,description,price,image_key,tag,active,featured,display_order,product_type,variant_label,addon_label,variant_required,max_addons,badges,search_keywords,spice_level,in_stock,available_days,available_from,available_until,prep_time_minutes,recommended_ids,frequently_bought_ids,meal_upgrade_ids,meal_upgrade_label",
      )
      .order("display_order", { ascending: true }),


    supabase
      .from("orders")
      .select("id,customer_name,customer_phone,subtotal,discount,total,status,notes,created_at,items")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("categories")
      .select("id,name,slug,display_order,active,default_product_type,variant_label,addon_label")
      .order("display_order", { ascending: true }),

    supabase
      .from("menu_item_variants")
      .select("id,menu_item_id,name,price,available,display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("menu_item_addons")
      .select("id,menu_item_id,name,price,available,display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("offers")
      .select("id,title,description,image_key,discount_label,starts_at,ends_at,active,display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("gallery_images")
      .select("id,image_key,caption,display_order,active")
      .order("display_order", { ascending: true }),
    supabase
      .from("testimonials")
      .select("id,customer_name,rating,review,image_key,active,display_order")
      .order("display_order", { ascending: true }),
    supabase.from("hero_content").select("*").eq("id", "default").maybeSingle(),
    supabase.from("business_settings").select("*").eq("id", "default").maybeSingle(),
  ]);

  const errored = [
    menuResult,
    orderResult,
    catResult,
    variantResult,
    addonResult,
    offerResult,
    galleryResult,
    testResult,
    heroResult,
    settingsResult,
  ].find((r) => r.error);
  if (errored?.error) throw new Error(errored.error.message);

  const hero = heroResult.data;
  const s = settingsResult.data;

  return {
    isAdmin: true,
    menuItems: (menuResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      price: Number(item.price),
      imageKey: item.image_key,
      tag: item.tag,
      active: item.active,
      featured: item.featured,
      displayOrder: item.display_order,
      productType: (item.product_type ?? "simple") as AdminMenuItem["productType"],
      variantLabel: item.variant_label,
      addonLabel: item.addon_label,
      variantRequired: item.variant_required ?? true,
      maxAddons: item.max_addons ?? null,
      prepTimeMinutes: item.prep_time_minutes ?? null,
      recommendedIds: item.recommended_ids ?? [],
      frequentlyBoughtIds: item.frequently_bought_ids ?? [],
      mealUpgradeIds: item.meal_upgrade_ids ?? [],
      mealUpgradeLabel: item.meal_upgrade_label || "Complete your meal",
      badges: item.badges ?? [],
      searchKeywords: item.search_keywords ?? [],
      spiceLevel: item.spice_level ?? 0,
      inStock: item.in_stock ?? true,
      availability: {
        days: item.available_days ?? [],
        from: item.available_from ? String(item.available_from).slice(0, 5) : null,
        until: item.available_until ? String(item.available_until).slice(0, 5) : null,
      },
    })),


    orders: (orderResult.data ?? []).map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      status: order.status,
      notes: order.notes,
      createdAt: order.created_at,
      items: (Array.isArray(order.items) ? order.items : []) as AdminOrder["items"],
    })),
    categories: (catResult.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      displayOrder: c.display_order,
      active: c.active,
      defaultProductType: (c.default_product_type ?? "simple") as AdminCategory["defaultProductType"],
      variantLabel: c.variant_label ?? "Choose an option",
      addonLabel: c.addon_label ?? "Add-ons",
    })),

    variants: (variantResult.data ?? []).map((v) => ({
      id: v.id,
      menuItemId: v.menu_item_id,
      name: v.name,
      price: Number(v.price),
      available: v.available,
      displayOrder: v.display_order,
    })),
    addons: (addonResult.data ?? []).map((a) => ({
      id: a.id,
      menuItemId: a.menu_item_id,
      name: a.name,
      price: Number(a.price),
      available: a.available,
      displayOrder: a.display_order,
    })),
    offers: (offerResult.data ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      imageKey: o.image_key,
      discountLabel: o.discount_label,
      startsAt: o.starts_at,
      endsAt: o.ends_at,
      active: o.active,
      displayOrder: o.display_order,
    })),
    gallery: (galleryResult.data ?? []).map((g) => ({
      id: g.id,
      imageKey: g.image_key,
      caption: g.caption,
      displayOrder: g.display_order,
      active: g.active,
    })),
    testimonials: (testResult.data ?? []).map((t) => ({
      id: t.id,
      customerName: t.customer_name,
      rating: t.rating,
      review: t.review,
      imageKey: t.image_key,
      active: t.active,
      displayOrder: t.display_order,
    })),
    hero: hero
      ? {
          heading: hero.heading,
          subheading: hero.subheading,
          ctaText: hero.cta_text,
          backgroundKey: hero.background_key,
          bannerKey: hero.banner_key,
        }
      : DEFAULT_HERO,
    settings: s
      ? {
          restaurantName: s.restaurant_name,
          logoKey: s.logo_key,
          phone: s.phone,
          phoneSecondary: s.phone_secondary ?? "",
          whatsappNumber: s.whatsapp_number,
          email: s.email,
          address: s.address,
          mapsUrl: s.maps_url,
          hours: (s.hours as AdminBusinessSettings["hours"]) ?? [],
          deliveryCharges: Number(s.delivery_charges),
          minOrder: Number(s.min_order),
          deliveryRadiusKm: Number(s.delivery_radius_km ?? 0),
          isOpen: s.is_open ?? true,
          closedMessage: s.closed_message ?? "",
          announcement: s.announcement ?? "",
          announcementActive: s.announcement_active ?? false,
          social: (s.social as AdminBusinessSettings["social"]) ?? {},
        }
      : DEFAULT_SETTINGS,
  };
}

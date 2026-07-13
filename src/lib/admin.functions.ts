import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadAdminDashboard, requireAdmin } from "./admin.server";
import {
  MenuItemInputSchema,
  OrderStatusInputSchema,
  CategoryInputSchema,
  VariantInputSchema,
  AddonInputSchema,
  OfferInputSchema,
  GalleryInputSchema,
  TestimonialInputSchema,
  HeroInputSchema,
  BusinessSettingsInputSchema,
  DeleteByIdSchema,
  UploadMediaSchema,
} from "./admin.schemas";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadAdminDashboard(context.supabase, context.userId));

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("user_roles").insert({
      user_id: context.userId,
      role: "admin",
    });
    if (error) throw new Error("Admin has already been claimed or you are not allowed to claim it.");
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Menu items ----------------------------- */

export const createMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MenuItemInputSchema.omit({ id: true }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("menu_items").insert({
      name: data.name,
      category: data.category,
      description: data.description,
      price: data.price,
      image_key: data.imageKey,
      tag: data.tag ?? null,
      active: data.active,
      featured: data.featured,
      display_order: data.displayOrder,
    });
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const updateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MenuItemInputSchema.required({ id: true }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("menu_items")
      .update({
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        image_key: data.imageKey,
        tag: data.tag ?? null,
        active: data.active,
        featured: data.featured,
        display_order: data.displayOrder,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Orders --------------------------------- */

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OrderStatusInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });



/* --------------------------------- Categories ----------------------------- */

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CategoryInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      name: data.name,
      slug: data.slug,
      display_order: data.displayOrder,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("categories").update(payload).eq("id", data.id)
      : context.supabase.from("categories").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Variants ------------------------------- */

export const upsertVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VariantInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      menu_item_id: data.menuItemId,
      name: data.name,
      price: data.price,
      available: data.available,
      display_order: data.displayOrder,
    };
    const q = data.id
      ? context.supabase.from("menu_item_variants").update(payload).eq("id", data.id)
      : context.supabase.from("menu_item_variants").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("menu_item_variants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Addons --------------------------------- */

export const upsertAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddonInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      menu_item_id: data.menuItemId,
      name: data.name,
      price: data.price,
      available: data.available,
      display_order: data.displayOrder,
    };
    const q = data.id
      ? context.supabase.from("menu_item_addons").update(payload).eq("id", data.id)
      : context.supabase.from("menu_item_addons").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("menu_item_addons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Offers --------------------------------- */

export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OfferInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      title: data.title,
      description: data.description,
      image_key: data.imageKey,
      discount_label: data.discountLabel ?? null,
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
      active: data.active,
      display_order: data.displayOrder,
    };
    const q = data.id
      ? context.supabase.from("offers").update(payload).eq("id", data.id)
      : context.supabase.from("offers").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("offers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Gallery -------------------------------- */

export const upsertGalleryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GalleryInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      image_key: data.imageKey,
      caption: data.caption ?? null,
      display_order: data.displayOrder,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("gallery_images").update(payload).eq("id", data.id)
      : context.supabase.from("gallery_images").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteGalleryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Testimonials --------------------------- */

export const upsertTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TestimonialInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      customer_name: data.customerName,
      rating: data.rating,
      review: data.review,
      image_key: data.imageKey ?? null,
      active: data.active,
      display_order: data.displayOrder,
    };
    const q = data.id
      ? context.supabase.from("testimonials").update(payload).eq("id", data.id)
      : context.supabase.from("testimonials").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteByIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Hero + Settings ------------------------ */

export const updateHero = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HeroInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("hero_content").upsert({
      id: "default",
      heading: data.heading,
      subheading: data.subheading,
      cta_text: data.ctaText,
      background_key: data.backgroundKey,
      banner_key: data.bannerKey,
    });
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

export const updateBusinessSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessSettingsInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("business_settings").upsert({
      id: "default",
      restaurant_name: data.restaurantName,
      logo_key: data.logoKey,
      phone: data.phone,
      whatsapp_number: data.whatsappNumber,
      email: data.email,
      address: data.address,
      maps_url: data.mapsUrl,
      hours: data.hours,
      delivery_charges: data.deliveryCharges,
      min_order: data.minOrder,
      social: data.social,
    });
    if (error) throw new Error(error.message);
    return loadAdminDashboard(context.supabase, context.userId);
  });

/* --------------------------------- Media upload --------------------------- */

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadMediaSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ url: string; path: string }> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // base64 may be a data URL like "data:image/png;base64,AAA..." — strip prefix.
    const base64 = data.base64.includes(",") ? data.base64.split(",", 2)[1] : data.base64;
    const buffer = Buffer.from(base64, "base64");

    const cleanName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

    const upload = await supabaseAdmin.storage
      .from("restaurant-media")
      .upload(path, buffer, { contentType: data.contentType, upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    // 10-year signed URL for public consumption
    const signed = await supabaseAdmin.storage
      .from("restaurant-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) throw new Error(signed.error.message);

    return { url: signed.data.signedUrl, path };
  });

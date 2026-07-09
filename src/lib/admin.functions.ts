import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadAdminDashboard, requireAdmin } from "./admin.server";
import { MenuItemInputSchema, OrderStatusInputSchema } from "./admin.schemas";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return loadAdminDashboard(context.supabase, context.userId);
  });

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
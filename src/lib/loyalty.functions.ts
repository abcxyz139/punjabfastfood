import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  fetchPrograms,
  loadCustomerLoyalty,
  loadLoyaltyAnalytics,
} from "./loyalty.server";
import { requireAdmin } from "./admin.server";
import { LoyaltyProgramInputSchema } from "./admin.schemas";

/* ------------------------------- Customer side ------------------------------ */

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadCustomerLoyalty(context.supabase, context.userId));

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ menuItemId: z.string().uuid(), favorite: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.favorite) {
      const { error } = await context.supabase
        .from("customer_favorites")
        .upsert(
          { user_id: context.userId, menu_item_id: data.menuItemId },
          { onConflict: "user_id,menu_item_id" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("customer_favorites")
        .delete()
        .eq("user_id", context.userId)
        .eq("menu_item_id", data.menuItemId);
      if (error) throw new Error(error.message);
    }
    return { favorite: data.favorite };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("loyalty_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- Admin side ------------------------------- */

export const getLoyaltyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const programs = await fetchPrograms(context.supabase, false);
    const analytics = await loadLoyaltyAnalytics(context.supabase, programs);
    return { programs, analytics };
  });

export const upsertLoyaltyProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LoyaltyProgramInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const payload = {
      name: data.name,
      description: data.description,
      earn_type: data.earnType,
      target_menu_item_id: data.targetMenuItemId ?? null,
      target_category_id: data.targetCategoryId ?? null,
      threshold: data.threshold,
      reward_type: data.rewardType,
      reward_value: data.rewardValue,
      reward_menu_item_id: data.rewardMenuItemId ?? null,
      reward_label: data.rewardLabel,
      active: data.active,
      priority: data.priority,
      usage_limit_per_customer: data.usageLimitPerCustomer ?? null,
      expiry_mode: data.expiryMode,
      expiry_days: data.expiryDays ?? null,
      expires_at: data.expiresAt ?? null,
      stack_mode: data.stackMode,
      campaign: data.campaign,
      applicable_customer_ids: data.applicableCustomerIds,
    };

    const { error } = data.id
      ? await context.supabase.from("loyalty_programs").update(payload).eq("id", data.id)
      : await context.supabase.from("loyalty_programs").insert(payload);
    if (error) throw new Error(error.message);

    const programs = await fetchPrograms(context.supabase, false);
    const analytics = await loadLoyaltyAnalytics(context.supabase, programs);
    return { programs, analytics };
  });

export const deleteLoyaltyProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("loyalty_programs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const programs = await fetchPrograms(context.supabase, false);
    const analytics = await loadLoyaltyAnalytics(context.supabase, programs);
    return { programs, analytics };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CustomerOrderInputSchema } from "./admin.schemas";

export const createCustomerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CustomerOrderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        items: data.items,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        notes: data.notes ?? null,
      })
      .select("id,total,status,created_at")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      createdAt: order.created_at,
    };
  });
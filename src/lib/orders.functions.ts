import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CustomerOrderInputSchema } from "./admin.schemas";

export const createCustomerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CustomerOrderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Recalculate pricing server-side from menu_items — never trust client prices.
    const ids = Array.from(new Set(data.items.map((i) => i.id)));
    const { data: menuRows, error: menuErr } = await context.supabase
      .from("menu_items")
      .select("id,name,price,active")
      .in("id", ids);
    if (menuErr) throw new Error(menuErr.message);

    const menuById = new Map(
      (menuRows ?? []).map((r) => [r.id, r]),
    );

    const lineItems: Array<{ id: string; name: string; price: number; quantity: number; lineTotal: number }> = [];
    for (const it of data.items) {
      const row = menuById.get(it.id);
      if (!row || row.active === false) {
        throw new Error("One or more items are unavailable.");
      }
      const price = Number(row.price);
      const lineTotal = Math.round(price * it.quantity * 100) / 100;
      lineItems.push({ id: row.id, name: row.name, price, quantity: it.quantity, lineTotal });
    }

    const subtotal = Math.round(lineItems.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    // No server-validated discount logic yet — enforce zero to prevent tampering.
    const discount = 0;
    const total = Math.round((subtotal - discount) * 100) / 100;

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        items: lineItems,
        subtotal,
        discount,
        total,
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

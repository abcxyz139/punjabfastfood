import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AdminMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageKey: string;
  tag: string | null;
  active: boolean;
  featured: boolean;
  displayOrder: number;
};

export type AdminOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  items: unknown;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

type CloudClient = SupabaseClient<Database>;

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

export async function loadAdminDashboard(supabase: CloudClient, userId: string) {
  const admin = await isCurrentUserAdmin(supabase, userId);
  if (!admin) {
    return {
      isAdmin: false,
      menuItems: [] as AdminMenuItem[],
      orders: [] as AdminOrder[],
    };
  }

  const [menuResult, orderResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id,name,category,description,price,image_key,tag,active,featured,display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("orders")
      .select("id,customer_name,customer_phone,items,subtotal,discount,total,status,notes,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (menuResult.error) throw new Error(menuResult.error.message);
  if (orderResult.error) throw new Error(orderResult.error.message);

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
    })),
    orders: (orderResult.data ?? []).map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      items: order.items,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      status: order.status,
      notes: order.notes,
      createdAt: order.created_at,
    })),
  };
}
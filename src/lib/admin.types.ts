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
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type AdminDashboardSnapshot = {
  isAdmin: boolean;
  menuItems: AdminMenuItem[];
  orders: AdminOrder[];
};
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Check, Flame, Loader2, LogOut, Plus, ShieldCheck, ShoppingBag, Star, Utensils } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { claimFirstAdmin, createMenuItem, getAdminDashboard, updateMenuItem, updateOrderStatus } from "@/lib/admin.functions";
import type { AdminDashboardSnapshot, AdminMenuItem, AdminOrder } from "@/lib/admin.types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Punjab Fast Food" },
      { name: "description", content: "Secure admin dashboard for managing Punjab Fast Food menu items and customer orders." },
      { property: "og:title", content: "Admin Panel — Punjab Fast Food" },
      { property: "og:description", content: "Manage menu items, availability, and orders." },
    ],
  }),
  component: AdminPage,
});

type Snapshot = AdminDashboardSnapshot;

const emptyDraft = {
  name: "",
  category: "Burgers",
  description: "",
  price: 0,
  imageKey: "burger",
  tag: "",
  active: true,
  featured: false,
  displayOrder: 100,
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadDashboard = useServerFn(getAdminDashboard);
  const claimAdmin = useServerFn(claimFirstAdmin);
  const saveNewItem = useServerFn(createMenuItem);
  const saveItem = useServerFn(updateMenuItem);
  const saveStatus = useServerFn(updateOrderStatus);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<AdminMenuItem | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const menuItems = snapshot?.menuItems ?? [];
    const orders = snapshot?.orders ?? [];
    return {
      active: menuItems.filter((item) => item.active).length,
      featured: menuItems.filter((item) => item.featured).length,
      openOrders: orders.filter((order) => ["new", "preparing", "ready"].includes(order.status)).length,
      revenue: orders.reduce((sum, order) => sum + order.total, 0),
    };
  }, [snapshot]);

  useEffect(() => {
    let alive = true;
    loadDashboard()
      .then((data) => {
        if (alive) setSnapshot(data);
      })
      .catch((error) => {
        if (alive) setMessage(error instanceof Error ? error.message : "Unable to load admin panel.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadDashboard]);

  async function handleClaimAdmin() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await claimAdmin();
      setSnapshot(data);
      setMessage("Admin access activated for this account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to claim admin access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveNewItem({ data: { ...draft, tag: draft.tag || null } });
      setSnapshot(data);
      setDraft(emptyDraft);
      setMessage("Menu item added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: AdminMenuItem, patch: Partial<AdminMenuItem>) {
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveItem({
        data: {
          id: item.id,
          name: patch.name ?? item.name,
          category: patch.category ?? item.category,
          description: patch.description ?? item.description,
          price: patch.price ?? item.price,
          imageKey: patch.imageKey ?? item.imageKey,
          tag: patch.tag ?? item.tag,
          active: patch.active ?? item.active,
          featured: patch.featured ?? item.featured,
          displayOrder: patch.displayOrder ?? item.displayOrder,
        },
      });
      setSnapshot(data);
      setMessage("Menu item updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOrderStatus(id: string, status: AdminOrder["status"]) {
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveStatus({ data: { id, status: status as "new" | "preparing" | "ready" | "completed" | "cancelled" } });
      setSnapshot(data);
      setMessage("Order status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-brand-black text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-brand-red grid place-items-center"><Flame className="size-5 text-brand-gold" /></div>
            <div>
              <div className="font-display text-2xl uppercase tracking-tighter">Punjab Admin</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Live operations</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="px-4 py-2 border border-white/15 hover:border-brand-gold text-xs font-bold uppercase tracking-tighter flex items-center gap-2 transition-colors">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="min-h-[50vh] grid place-items-center"><Loader2 className="size-10 animate-spin text-brand-gold" /></div>
        ) : snapshot && !snapshot.isAdmin ? (
          <div className="max-w-2xl mx-auto py-24 text-center">
            <ShieldCheck className="size-14 text-brand-gold mx-auto mb-8" />
            <h1 className="font-display text-6xl md:text-8xl uppercase tracking-tighter leading-none mb-6">Claim Admin</h1>
            <p className="text-white/60 mb-8 leading-relaxed">If this is the first staff account, activate secure admin access for it. If an admin already exists, this action will be blocked.</p>
            <button onClick={handleClaimAdmin} disabled={saving} className="px-8 py-4 bg-brand-red hover:bg-brand-orange hover:text-brand-black font-bold uppercase tracking-tighter transition-colors disabled:opacity-60 inline-flex items-center gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Activate Admin Access
            </button>
            {message && <p className="mt-6 text-brand-gold text-sm">{message}</p>}
          </div>
        ) : snapshot ? (
          <div className="space-y-8">
            <div className="grid md:grid-cols-4 gap-4">
              <StatCard icon={Utensils} label="Active Items" value={String(stats.active)} />
              <StatCard icon={Star} label="Featured" value={String(stats.featured)} />
              <StatCard icon={ShoppingBag} label="Open Orders" value={String(stats.openOrders)} />
              <StatCard icon={Flame} label="Recent Revenue" value={`$${stats.revenue.toFixed(2)}`} />
            </div>

            {message && <div className="border border-brand-gold/30 bg-brand-gold/10 text-brand-gold px-4 py-3 text-sm font-mono">{message}</div>}

            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-6">
              <form onSubmit={handleCreate} className="bg-white text-brand-black p-6 space-y-4 self-start">
                <h2 className="font-display text-4xl uppercase tracking-tighter mb-2">Add Menu Item</h2>
                <AdminInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
                <AdminInput label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
                <label className="block text-xs font-mono uppercase tracking-widest text-brand-black/50">
                  Description
                  <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required rows={4} className="mt-2 w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red resize-none" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Price" type="number" value={String(draft.price)} onChange={(value) => setDraft({ ...draft, price: Number(value) })} />
                  <AdminInput label="Image Key" value={draft.imageKey} onChange={(value) => setDraft({ ...draft, imageKey: value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Tag" value={draft.tag} onChange={(value) => setDraft({ ...draft, tag: value })} />
                  <AdminInput label="Order" type="number" value={String(draft.displayOrder)} onChange={(value) => setDraft({ ...draft, displayOrder: Number(value) })} />
                </div>
                <div className="flex gap-4 text-sm font-bold">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Active</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /> Featured</label>
                </div>
                <button disabled={saving} className="w-full py-4 bg-brand-red text-white hover:bg-brand-black font-bold uppercase tracking-tighter transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add Item
                </button>
              </form>

              <div className="space-y-4">
                <h2 className="font-display text-5xl uppercase tracking-tighter">Menu Control</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {snapshot.menuItems.map((item) => (
                    <motion.div key={item.id} layout className="bg-white text-brand-black p-5 border-l-4 border-brand-gold">
                      <div className="flex justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-display text-3xl uppercase tracking-tighter leading-none">{item.name}</h3>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-black/40 mt-1">{item.category}</p>
                        </div>
                        <div className="font-display text-3xl text-brand-red">${item.price.toFixed(2)}</div>
                      </div>
                      <p className="text-xs text-brand-black/60 leading-relaxed mb-4">{item.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggle(item, { active: !item.active })} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${item.active ? "bg-brand-black text-white" : "bg-brand-black/10"}`}>{item.active ? "Active" : "Hidden"}</button>
                        <button onClick={() => handleToggle(item, { featured: !item.featured })} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${item.featured ? "bg-brand-gold" : "bg-brand-black/10"}`}>Featured</button>
                        <button onClick={() => setSelected(item)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-brand-black/10 hover:border-brand-red">Details</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white text-brand-black p-6">
              <h2 className="font-display text-5xl uppercase tracking-tighter mb-6">Recent Orders</h2>
              {snapshot.orders.length === 0 ? (
                <p className="text-sm text-brand-black/50">No live orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {snapshot.orders.map((order) => (
                    <div key={order.id} className="grid md:grid-cols-[1fr_auto] gap-4 border border-brand-black/10 p-4">
                      <div>
                        <div className="font-bold">{order.customerName} · {order.customerPhone}</div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-brand-black/40 mt-1">{new Date(order.createdAt).toLocaleString()}</div>
                        <div className="mt-2 font-display text-3xl text-brand-red">${order.total.toFixed(2)}</div>
                      </div>
                      <select value={order.status} onChange={(event) => handleOrderStatus(order.id, event.target.value)} className="self-start border border-brand-black/10 px-3 py-2 font-bold uppercase text-xs">
                        {['new', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-white text-brand-black p-6 max-w-lg w-full" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="font-display text-4xl uppercase tracking-tighter">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-sm font-bold uppercase">Close</button>
            </div>
            <p className="text-sm leading-relaxed text-brand-black/60 mb-4">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Category" value={selected.category} />
              <Info label="Image" value={selected.imageKey} />
              <Info label="Tag" value={selected.tag ?? "—"} />
              <Info label="Display" value={String(selected.displayOrder)} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="bg-white text-brand-black p-5">
      <Icon className="size-5 text-brand-red mb-5" />
      <div className="font-display text-5xl uppercase tracking-tighter">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-black/40">{label}</div>
    </div>
  );
}

function AdminInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-widest text-brand-black/50">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} required className="mt-2 w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red" />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-black/10 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-brand-black/40 mb-1">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
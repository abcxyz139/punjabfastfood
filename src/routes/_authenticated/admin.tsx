import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2, LogOut, ShieldCheck, ShoppingBag, Star, Upload, Utensils, Trash2, Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  claimFirstAdmin,
  createMenuItem,
  deleteAddon,
  deleteCategory,
  deleteGalleryImage,
  deleteMenuItem,
  deleteOffer,
  deleteTestimonial,
  deleteVariant,
  getAdminDashboard,
  updateBusinessSettings,
  updateHero,
  updateMenuItem,
  updateOrderStatus,
  uploadMedia,
  upsertAddon,
  upsertCategory,
  upsertGalleryImage,
  upsertOffer,
  upsertTestimonial,
  upsertVariant,
} from "@/lib/admin.functions";
import type {
  AdminAddon,
  AdminBusinessSettings,
  AdminCategory,
  AdminDashboardSnapshot,
  AdminGalleryImage,
  AdminHero,
  AdminMenuItem,
  AdminOffer,
  AdminOrder,
  AdminTestimonial,
  AdminVariant,
} from "@/lib/admin.types";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Punjab Fast Food" },
      { name: "description", content: "Secure admin dashboard for managing Punjab Fast Food." },
    ],
  }),
  component: AdminPage,
});

type Snapshot = AdminDashboardSnapshot;

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadDashboard = useServerFn(getAdminDashboard);
  const claimAdmin = useServerFn(claimFirstAdmin);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = (data: Snapshot) => setSnapshot(data);

  useEffect(() => {
    let alive = true;
    loadDashboard()
      .then((data) => alive && setSnapshot(data))
      .catch((error) => alive && setMessage({ kind: "err", text: error instanceof Error ? error.message : "Unable to load." }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [loadDashboard]);

  const handleClaimAdmin = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = await claimAdmin();
      setSnapshot(data);
      setMessage({ kind: "ok", text: "Admin access activated." });
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "Unable to claim." });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const stats = useMemo(() => {
    const menuItems = snapshot?.menuItems ?? [];
    const orders = snapshot?.orders ?? [];
    return {
      active: menuItems.filter((i) => i.active).length,
      featured: menuItems.filter((i) => i.featured).length,
      openOrders: orders.filter((o) => ["new", "preparing", "ready"].includes(o.status)).length,
      revenue: orders.reduce((s, o) => s + o.total, 0),
    };
  }, [snapshot]);

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
        ) : !snapshot ? (
          <div className="max-w-2xl mx-auto py-24 text-center space-y-6">
            <ShieldCheck className="size-14 text-red-400 mx-auto" />
            <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none">Unable to load admin</h1>
            <p className="text-red-300 font-mono text-sm break-words">{message?.text ?? "The dashboard failed to load. Please refresh and try again."}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setLoading(true);
                  setMessage(null);
                  loadDashboard()
                    .then((data) => setSnapshot(data))
                    .catch((error) => setMessage({ kind: "err", text: error instanceof Error ? error.message : "Unable to load." }))
                    .finally(() => setLoading(false));
                }}
                className="px-6 py-3 bg-brand-red hover:bg-brand-orange hover:text-brand-black font-bold uppercase tracking-tighter text-xs transition-colors"
              >
                Retry
              </button>
              <button onClick={handleSignOut} className="px-6 py-3 border border-white/15 hover:border-brand-gold text-xs font-bold uppercase tracking-tighter">Sign out</button>
            </div>
          </div>
        ) : !snapshot.isAdmin ? (
          <div className="max-w-2xl mx-auto py-24 text-center">
            <ShieldCheck className="size-14 text-brand-gold mx-auto mb-8" />
            <h1 className="font-display text-6xl md:text-8xl uppercase tracking-tighter leading-none mb-6">Claim Admin</h1>
            <p className="text-white/60 mb-8 leading-relaxed">If this is the first staff account, activate admin access. If an admin already exists, this will be blocked.</p>
            <button onClick={handleClaimAdmin} disabled={saving} className="px-8 py-4 bg-brand-red hover:bg-brand-orange hover:text-brand-black font-bold uppercase tracking-tighter transition-colors disabled:opacity-60 inline-flex items-center gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Activate Admin
            </button>
            {message && <p className={`mt-6 text-sm ${message.kind === "ok" ? "text-brand-gold" : "text-red-400"}`}>{message.text}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            {message && (
              <div className={`border px-4 py-3 text-sm font-mono flex justify-between items-center ${message.kind === "ok" ? "border-brand-gold/30 bg-brand-gold/10 text-brand-gold" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)}><X className="size-4" /></button>
              </div>
            )}

            <div className="grid md:grid-cols-4 gap-4">
              <StatCard icon={<Utensils className="size-5 text-brand-red" />} label="Active Items" value={String(stats.active)} />
              <StatCard icon={<Star className="size-5 text-brand-red" />} label="Featured" value={String(stats.featured)} />
              <StatCard icon={<ShoppingBag className="size-5 text-brand-red" />} label="Open Orders" value={String(stats.openOrders)} />
              <StatCard icon={<Flame className="size-5 text-brand-red" />} label="Recent Revenue" value={`$${stats.revenue.toFixed(2)}`} />
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 h-auto flex-wrap justify-start p-1">
                {["dashboard", "menu", "categories", "hero", "offers", "gallery", "testimonials", "orders", "settings"].map((t) => (
                  <TabsTrigger key={t} value={t} className="capitalize text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-brand-red data-[state=active]:text-white">
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <DashboardTab snapshot={snapshot} />
              </TabsContent>
              <TabsContent value="menu" className="mt-6">
                <MenuTab snapshot={snapshot} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="categories" className="mt-6">
                <CategoriesTab items={snapshot.categories} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="hero" className="mt-6">
                <HeroTab hero={snapshot.hero} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="offers" className="mt-6">
                <OffersTab items={snapshot.offers} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="gallery" className="mt-6">
                <GalleryTab items={snapshot.gallery} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="testimonials" className="mt-6">
                <TestimonialsTab items={snapshot.testimonials} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="orders" className="mt-6">
                <OrdersTab items={snapshot.orders} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
              <TabsContent value="settings" className="mt-6">
                <SettingsTab settings={snapshot.settings} refresh={refresh} setMessage={setMessage} saving={saving} setSaving={setSaving} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white text-brand-black p-5">
      <div className="mb-5">{icon}</div>
      <div className="font-display text-5xl uppercase tracking-tighter">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brand-black/40">{label}</div>
    </div>
  );
}

/* --------------------------------- Shared UI ------------------------------ */

type TabProps<T> = {
  items: T[];
  refresh: (s: Snapshot) => void;
  setMessage: (m: { kind: "ok" | "err"; text: string } | null) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-widest text-brand-black/50">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full border border-brand-black/10 p-3 font-body text-sm outline-none focus:border-brand-red resize-none ${props.className ?? ""}`} />;
}

function Btn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`px-4 py-3 bg-brand-red text-white hover:bg-brand-black font-bold uppercase tracking-tighter text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="bg-white text-brand-black p-6">{children}</div>;
}

function ImageUploader({ value, onChange, setMessage }: { value: string; onChange: (v: string) => void; setMessage: (m: { kind: "ok" | "err"; text: string } | null) => void }) {
  const upload = useServerFn(uploadMedia);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ kind: "err", text: "Max file size 10MB." });
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await upload({ data: { fileName: file.name, contentType: file.type || "image/jpeg", base64 } });
      onChange(res.url);
      setMessage({ kind: "ok", text: "Image uploaded." });
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or upload" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 border border-brand-black/10 hover:border-brand-red text-xs font-bold uppercase inline-flex items-center gap-1 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {value && value.startsWith("http") && (
        <img src={value} alt="preview" className="h-20 w-20 object-cover border border-brand-black/10" />
      )}
    </div>
  );
}

async function runAction<T>(
  fn: () => Promise<Snapshot>,
  ctx: { refresh: (s: Snapshot) => void; setMessage: TabProps<T>["setMessage"]; setSaving: (v: boolean) => void; okText?: string },
) {
  ctx.setSaving(true);
  ctx.setMessage(null);
  try {
    const data = await fn();
    ctx.refresh(data);
    if (ctx.okText) ctx.setMessage({ kind: "ok", text: ctx.okText });
  } catch (err) {
    ctx.setMessage({ kind: "err", text: err instanceof Error ? err.message : "Action failed." });
  } finally {
    ctx.setSaving(false);
  }
}

/* --------------------------------- Menu Tab ------------------------------- */

function MenuTab({ snapshot, refresh, setMessage, saving, setSaving }: { snapshot: Snapshot; refresh: (s: Snapshot) => void; setMessage: TabProps<never>["setMessage"]; saving: boolean; setSaving: (v: boolean) => void }) {
  const create = useServerFn(createMenuItem);
  const update = useServerFn(updateMenuItem);
  const remove = useServerFn(deleteMenuItem);
  const [editing, setEditing] = useState<Partial<AdminMenuItem> & { id?: string }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startNew = () => setEditing({ name: "", category: snapshot.categories[0]?.name ?? "Burgers", description: "", price: 0, imageKey: "", tag: "", active: true, featured: false, displayOrder: 100 });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing.name) return;
    await runAction(
      () =>
        editing.id
          ? update({ data: { id: editing.id, name: editing.name!, category: editing.category!, description: editing.description!, price: Number(editing.price), imageKey: editing.imageKey || "burger", tag: editing.tag || null, active: !!editing.active, featured: !!editing.featured, displayOrder: Number(editing.displayOrder) || 100 } })
          : create({ data: { name: editing.name!, category: editing.category!, description: editing.description!, price: Number(editing.price), imageKey: editing.imageKey || "burger", tag: editing.tag || null, active: !!editing.active, featured: !!editing.featured, displayOrder: Number(editing.displayOrder) || 100 } }),
      { refresh, setMessage, setSaving, okText: "Menu item saved." },
    );
    setEditing({});
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-4xl uppercase tracking-tighter">Menu Items</h2>
          <Btn onClick={startNew}><Plus className="size-4" /> New Item</Btn>
        </div>
        {snapshot.menuItems.map((item) => (
          <div key={item.id} className="bg-white text-brand-black p-4 border-l-4 border-brand-gold">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="font-display text-2xl uppercase tracking-tighter">{item.name}</div>
                <div className="font-mono text-[10px] uppercase text-brand-black/40">{item.category} · ${item.price.toFixed(2)}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(item)} className="px-2 py-1 text-[10px] font-bold uppercase border border-brand-black/10 hover:border-brand-red">Edit</button>
                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="px-2 py-1 text-[10px] font-bold uppercase border border-brand-black/10 hover:border-brand-red">Options</button>
                <button onClick={() => runAction(() => remove({ data: { id: item.id } }), { refresh, setMessage, setSaving, okText: "Item deleted." })} className="px-2 py-1 text-[10px] font-bold uppercase bg-red-600 text-white"><Trash2 className="size-3" /></button>
              </div>
            </div>
            {expandedId === item.id && (
              <VariantsAddonsPanel item={item} snapshot={snapshot} refresh={refresh} setMessage={setMessage} setSaving={setSaving} />
            )}
          </div>
        ))}
      </div>

      {editing.name !== undefined || editing.id ? (
        <Card>
          <form onSubmit={save} className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-2xl uppercase tracking-tighter">{editing.id ? "Edit Item" : "New Item"}</h3>
              <button type="button" onClick={() => setEditing({})}><X className="size-5" /></button>
            </div>
            <Field label="Name"><TextInput value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
            <Field label="Category">
              <select value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="w-full border border-brand-black/10 p-3 text-sm">
                {snapshot.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description"><TextArea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price"><TextInput type="number" step="0.01" value={String(editing.price ?? 0)} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
              <Field label="Order"><TextInput type="number" value={String(editing.displayOrder ?? 100)} onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Image"><ImageUploader value={editing.imageKey ?? ""} onChange={(v) => setEditing({ ...editing, imageKey: v })} setMessage={setMessage} /></Field>
            <Field label="Tag (optional)"><TextInput value={editing.tag ?? ""} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} /></Field>
            <div className="flex gap-4 text-sm font-bold">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} /> Featured</label>
            </div>
            <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</Btn>
          </form>
        </Card>
      ) : (
        <Card><p className="text-brand-black/50 text-sm">Select an item to edit, or click New Item.</p></Card>
      )}
    </div>
  );
}

function VariantsAddonsPanel({ item, snapshot, refresh, setMessage, setSaving }: { item: AdminMenuItem; snapshot: Snapshot; refresh: (s: Snapshot) => void; setMessage: TabProps<never>["setMessage"]; setSaving: (v: boolean) => void }) {
  const upV = useServerFn(upsertVariant);
  const delV = useServerFn(deleteVariant);
  const upA = useServerFn(upsertAddon);
  const delA = useServerFn(deleteAddon);
  const [vName, setVName] = useState("");
  const [vPrice, setVPrice] = useState(0);
  const [aName, setAName] = useState("");
  const [aPrice, setAPrice] = useState(0);

  const variants = snapshot.variants.filter((v) => v.menuItemId === item.id);
  const addons = snapshot.addons.filter((a) => a.menuItemId === item.id);

  return (
    <div className="mt-4 pt-4 border-t border-brand-black/10 grid md:grid-cols-2 gap-4 text-sm">
      <div>
        <div className="font-bold uppercase text-xs mb-2">Variants</div>
        {variants.map((v) => (
          <div key={v.id} className="flex justify-between items-center py-1 border-b border-brand-black/5">
            <span>{v.name} — ${v.price.toFixed(2)}</span>
            <button onClick={() => runAction(() => delV({ data: { id: v.id } }), { refresh, setMessage, setSaving })} className="text-red-600"><Trash2 className="size-3" /></button>
          </div>
        ))}
        <div className="flex gap-1 mt-2">
          <TextInput placeholder="Small" value={vName} onChange={(e) => setVName(e.target.value)} className="flex-1" />
          <TextInput type="number" step="0.01" placeholder="Price" value={String(vPrice)} onChange={(e) => setVPrice(Number(e.target.value))} className="w-20" />
          <button onClick={() => { if (!vName) return; runAction(() => upV({ data: { menuItemId: item.id, name: vName, price: vPrice, available: true, displayOrder: 100 } }), { refresh, setMessage, setSaving }); setVName(""); setVPrice(0); }} className="px-2 bg-brand-red text-white"><Plus className="size-3" /></button>
        </div>
      </div>
      <div>
        <div className="font-bold uppercase text-xs mb-2">Add-ons</div>
        {addons.map((a) => (
          <div key={a.id} className="flex justify-between items-center py-1 border-b border-brand-black/5">
            <span>{a.name} — +${a.price.toFixed(2)}</span>
            <button onClick={() => runAction(() => delA({ data: { id: a.id } }), { refresh, setMessage, setSaving })} className="text-red-600"><Trash2 className="size-3" /></button>
          </div>
        ))}
        <div className="flex gap-1 mt-2">
          <TextInput placeholder="Extra Cheese" value={aName} onChange={(e) => setAName(e.target.value)} className="flex-1" />
          <TextInput type="number" step="0.01" placeholder="Price" value={String(aPrice)} onChange={(e) => setAPrice(Number(e.target.value))} className="w-20" />
          <button onClick={() => { if (!aName) return; runAction(() => upA({ data: { menuItemId: item.id, name: aName, price: aPrice, available: true, displayOrder: 100 } }), { refresh, setMessage, setSaving }); setAName(""); setAPrice(0); }} className="px-2 bg-brand-red text-white"><Plus className="size-3" /></button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Categories -------------------------------- */

function CategoriesTab({ items, refresh, setMessage, saving, setSaving }: TabProps<AdminCategory>) {
  const up = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const [draft, setDraft] = useState({ id: undefined as string | undefined, name: "", slug: "", displayOrder: 100, active: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(() => up({ data: draft }), { refresh, setMessage, setSaving, okText: "Category saved." });
    setDraft({ id: undefined, name: "", slug: "", displayOrder: 100, active: true });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <Card>
        <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Categories</h2>
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2 border-b border-brand-black/10">
              <div>
                <div className="font-bold">{c.name}</div>
                <div className="font-mono text-[10px] text-brand-black/40">{c.slug} · order {c.displayOrder} · {c.active ? "active" : "hidden"}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDraft({ id: c.id, name: c.name, slug: c.slug, displayOrder: c.displayOrder, active: c.active })} className="px-2 py-1 text-[10px] font-bold uppercase border border-brand-black/10">Edit</button>
                <button onClick={() => runAction(() => del({ data: { id: c.id } }), { refresh, setMessage, setSaving })} className="px-2 py-1 bg-red-600 text-white"><Trash2 className="size-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-display text-2xl uppercase tracking-tighter">{draft.id ? "Edit" : "New"} Category</h3>
          <Field label="Name"><TextInput required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></Field>
          <Field label="Slug"><TextInput required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
          <Field label="Order"><TextInput type="number" value={String(draft.displayOrder)} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
          <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</Btn>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------------- Hero ----------------------------------- */

function HeroTab({ hero, refresh, setMessage, saving, setSaving }: { hero: AdminHero; refresh: (s: Snapshot) => void; setMessage: TabProps<never>["setMessage"]; saving: boolean; setSaving: (v: boolean) => void }) {
  const up = useServerFn(updateHero);
  const [draft, setDraft] = useState(hero);
  useEffect(() => setDraft(hero), [hero]);

  return (
    <Card>
      <form onSubmit={async (e) => { e.preventDefault(); await runAction(() => up({ data: draft }), { refresh, setMessage, setSaving, okText: "Hero saved." }); }} className="space-y-4 max-w-2xl">
        <h2 className="font-display text-3xl uppercase tracking-tighter">Hero Section</h2>
        <Field label="Heading"><TextInput value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} /></Field>
        <Field label="Subheading"><TextArea rows={2} value={draft.subheading} onChange={(e) => setDraft({ ...draft, subheading: e.target.value })} /></Field>
        <Field label="CTA Text"><TextInput value={draft.ctaText} onChange={(e) => setDraft({ ...draft, ctaText: e.target.value })} /></Field>
        <Field label="Background Image"><ImageUploader value={draft.backgroundKey} onChange={(v) => setDraft({ ...draft, backgroundKey: v })} setMessage={setMessage} /></Field>
        <Field label="Banner Image"><ImageUploader value={draft.bannerKey} onChange={(v) => setDraft({ ...draft, bannerKey: v })} setMessage={setMessage} /></Field>
        <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Hero</Btn>
      </form>
    </Card>
  );
}

/* --------------------------------- Offers --------------------------------- */

function OffersTab({ items, refresh, setMessage, saving, setSaving }: TabProps<AdminOffer>) {
  const up = useServerFn(upsertOffer);
  const del = useServerFn(deleteOffer);
  type Draft = { id?: string; title: string; description: string; imageKey: string; discountLabel: string; startsAt: string; endsAt: string; active: boolean; displayOrder: number };
  const empty: Draft = { title: "", description: "", imageKey: "", discountLabel: "", startsAt: "", endsAt: "", active: true, displayOrder: 100 };
  const [draft, setDraft] = useState<Draft>(empty);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(
      () =>
        up({
          data: {
            id: draft.id,
            title: draft.title,
            description: draft.description,
            imageKey: draft.imageKey,
            discountLabel: draft.discountLabel || null,
            startsAt: draft.startsAt || null,
            endsAt: draft.endsAt || null,
            active: draft.active,
            displayOrder: draft.displayOrder,
          },
        }),
      { refresh, setMessage, setSaving, okText: "Offer saved." },
    );
    setDraft(empty);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <Card>
        <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Offers</h2>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-brand-black/50 text-sm">No offers yet.</p>}
          {items.map((o) => (
            <div key={o.id} className="border border-brand-black/10 p-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-bold">{o.title}</div>
                  <div className="text-xs text-brand-black/60">{o.discountLabel} · {o.active ? "active" : "hidden"}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setDraft({ id: o.id, title: o.title, description: o.description, imageKey: o.imageKey, discountLabel: o.discountLabel ?? "", startsAt: o.startsAt ?? "", endsAt: o.endsAt ?? "", active: o.active, displayOrder: o.displayOrder })} className="px-2 py-1 text-[10px] font-bold uppercase border border-brand-black/10">Edit</button>
                  <button onClick={() => runAction(() => del({ data: { id: o.id } }), { refresh, setMessage, setSaving })} className="px-2 py-1 bg-red-600 text-white"><Trash2 className="size-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-display text-2xl uppercase tracking-tighter">{draft.id ? "Edit" : "New"} Offer</h3>
          <Field label="Title"><TextInput required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Description"><TextArea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Discount Label"><TextInput placeholder="20% OFF" value={draft.discountLabel} onChange={(e) => setDraft({ ...draft, discountLabel: e.target.value })} /></Field>
          <Field label="Image"><ImageUploader value={draft.imageKey} onChange={(v) => setDraft({ ...draft, imageKey: v })} setMessage={setMessage} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><TextInput type="datetime-local" value={draft.startsAt.slice(0, 16)} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></Field>
            <Field label="Ends"><TextInput type="datetime-local" value={draft.endsAt.slice(0, 16)} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
          <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</Btn>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------------- Gallery -------------------------------- */

function GalleryTab({ items, refresh, setMessage, saving, setSaving }: TabProps<AdminGalleryImage>) {
  const up = useServerFn(upsertGalleryImage);
  const del = useServerFn(deleteGalleryImage);
  const [draft, setDraft] = useState({ id: undefined as string | undefined, imageKey: "", caption: "", displayOrder: 100, active: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.imageKey) return setMessage({ kind: "err", text: "Add an image first." });
    await runAction(() => up({ data: { ...draft, caption: draft.caption || null } }), { refresh, setMessage, setSaving, okText: "Gallery updated." });
    setDraft({ id: undefined, imageKey: "", caption: "", displayOrder: 100, active: true });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <Card>
        <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Gallery</h2>
        <div className="grid grid-cols-3 gap-2">
          {items.map((g) => (
            <div key={g.id} className="relative group">
              <img src={g.imageKey} alt={g.caption ?? ""} className="aspect-square object-cover w-full" />
              <button onClick={() => runAction(() => del({ data: { id: g.id } }), { refresh, setMessage, setSaving })} className="absolute top-1 right-1 p-1 bg-red-600 text-white opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></button>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-display text-2xl uppercase tracking-tighter">Add Image</h3>
          <Field label="Image"><ImageUploader value={draft.imageKey} onChange={(v) => setDraft({ ...draft, imageKey: v })} setMessage={setMessage} /></Field>
          <Field label="Caption"><TextInput value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} /></Field>
          <Field label="Order"><TextInput type="number" value={String(draft.displayOrder)} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} /></Field>
          <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Add</Btn>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------------- Testimonials --------------------------- */

function TestimonialsTab({ items, refresh, setMessage, saving, setSaving }: TabProps<AdminTestimonial>) {
  const up = useServerFn(upsertTestimonial);
  const del = useServerFn(deleteTestimonial);
  const empty = { id: undefined as string | undefined, customerName: "", rating: 5, review: "", imageKey: "", active: true, displayOrder: 100 };
  const [draft, setDraft] = useState(empty);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(() => up({ data: { ...draft, imageKey: draft.imageKey || null } }), { refresh, setMessage, setSaving, okText: "Testimonial saved." });
    setDraft(empty);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <Card>
        <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Testimonials</h2>
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="border border-brand-black/10 p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-bold">{t.customerName} · {"★".repeat(t.rating)}</div>
                  <div className="text-xs text-brand-black/60 line-clamp-2">{t.review}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setDraft({ id: t.id, customerName: t.customerName, rating: t.rating, review: t.review, imageKey: t.imageKey ?? "", active: t.active, displayOrder: t.displayOrder })} className="px-2 py-1 text-[10px] font-bold uppercase border border-brand-black/10">Edit</button>
                  <button onClick={() => runAction(() => del({ data: { id: t.id } }), { refresh, setMessage, setSaving })} className="px-2 py-1 bg-red-600 text-white"><Trash2 className="size-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-display text-2xl uppercase tracking-tighter">{draft.id ? "Edit" : "New"} Testimonial</h3>
          <Field label="Customer Name"><TextInput required value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} /></Field>
          <Field label="Rating (1-5)"><TextInput type="number" min={1} max={5} value={String(draft.rating)} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} /></Field>
          <Field label="Review"><TextArea rows={3} required value={draft.review} onChange={(e) => setDraft({ ...draft, review: e.target.value })} /></Field>
          <Field label="Photo (optional)"><ImageUploader value={draft.imageKey} onChange={(v) => setDraft({ ...draft, imageKey: v })} setMessage={setMessage} /></Field>
          <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</Btn>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------------- Orders --------------------------------- */

function OrdersTab({ items, refresh, setMessage, saving, setSaving }: TabProps<AdminOrder>) {
  const up = useServerFn(updateOrderStatus);
  return (
    <Card>
      <h2 className="font-display text-3xl uppercase tracking-tighter mb-4">Orders</h2>
      {items.length === 0 ? (
        <p className="text-brand-black/50 text-sm">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o.id} className="border border-brand-black/10 p-4">
              <div className="grid md:grid-cols-[1fr_auto] gap-3">
                <div>
                  <div className="font-bold">{o.customerName} · {o.customerPhone}</div>
                  <div className="font-mono text-[10px] uppercase text-brand-black/40 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                  <div className="mt-2 font-display text-3xl text-brand-red">${o.total.toFixed(2)}</div>
                  {o.items.length > 0 && (
                    <ul className="mt-2 text-xs text-brand-black/70 space-y-0.5">
                      {o.items.map((li, idx) => (
                        <li key={idx}>{li.quantity}× {li.name}{li.variantName ? ` (${li.variantName})` : ""}{li.addons.length > 0 ? ` + ${li.addons.map((a) => a.name).join(", ")}` : ""} — ${li.lineTotal.toFixed(2)}</li>
                      ))}
                    </ul>
                  )}
                  {o.notes && <div className="mt-2 text-xs italic text-brand-black/50">Note: {o.notes}</div>}
                </div>
                <select
                  value={o.status}
                  onChange={(e) => runAction(() => up({ data: { id: o.id, status: e.target.value as "new" | "preparing" | "ready" | "completed" | "cancelled" } }), { refresh, setMessage, setSaving, okText: "Status updated." })}
                  disabled={saving}
                  className="self-start border border-brand-black/10 px-3 py-2 font-bold uppercase text-xs"
                >
                  {["new", "preparing", "ready", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* --------------------------------- Settings ------------------------------- */

function SettingsTab({ settings, refresh, setMessage, saving, setSaving }: { settings: AdminBusinessSettings; refresh: (s: Snapshot) => void; setMessage: TabProps<never>["setMessage"]; saving: boolean; setSaving: (v: boolean) => void }) {
  const up = useServerFn(updateBusinessSettings);
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  return (
    <Card>
      <form onSubmit={async (e) => { e.preventDefault(); await runAction(() => up({ data: draft }), { refresh, setMessage, setSaving, okText: "Settings saved." }); }} className="space-y-4 max-w-3xl">
        <h2 className="font-display text-3xl uppercase tracking-tighter">Business Settings</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Restaurant Name"><TextInput value={draft.restaurantName} onChange={(e) => setDraft({ ...draft, restaurantName: e.target.value })} /></Field>
          <Field label="WhatsApp Number (E.164)"><TextInput value={draft.whatsappNumber} onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })} placeholder="923017160216" /></Field>
          <Field label="Phone"><TextInput value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
          <Field label="Email"><TextInput type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        </div>
        <Field label="Address"><TextInput value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
        <Field label="Google Maps URL"><TextInput value={draft.mapsUrl} onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })} /></Field>
        <Field label="Logo"><ImageUploader value={draft.logoKey} onChange={(v) => setDraft({ ...draft, logoKey: v })} setMessage={setMessage} /></Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Delivery Charges"><TextInput type="number" step="0.01" value={String(draft.deliveryCharges)} onChange={(e) => setDraft({ ...draft, deliveryCharges: Number(e.target.value) })} /></Field>
          <Field label="Minimum Order"><TextInput type="number" step="0.01" value={String(draft.minOrder)} onChange={(e) => setDraft({ ...draft, minOrder: Number(e.target.value) })} /></Field>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Instagram"><TextInput value={draft.social.instagram ?? ""} onChange={(e) => setDraft({ ...draft, social: { ...draft.social, instagram: e.target.value } })} /></Field>
          <Field label="Facebook"><TextInput value={draft.social.facebook ?? ""} onChange={(e) => setDraft({ ...draft, social: { ...draft.social, facebook: e.target.value } })} /></Field>
          <Field label="TikTok"><TextInput value={draft.social.tiktok ?? ""} onChange={(e) => setDraft({ ...draft, social: { ...draft.social, tiktok: e.target.value } })} /></Field>
        </div>
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-brand-black/50 mb-2">Opening Hours</div>
          {draft.hours.map((h, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
              <TextInput placeholder="Day" value={h.day} onChange={(e) => { const copy = [...draft.hours]; copy[idx] = { ...h, day: e.target.value }; setDraft({ ...draft, hours: copy }); }} />
              <TextInput placeholder="Open" value={h.open} onChange={(e) => { const copy = [...draft.hours]; copy[idx] = { ...h, open: e.target.value }; setDraft({ ...draft, hours: copy }); }} />
              <TextInput placeholder="Close" value={h.close} onChange={(e) => { const copy = [...draft.hours]; copy[idx] = { ...h, close: e.target.value }; setDraft({ ...draft, hours: copy }); }} />
              <button type="button" onClick={() => setDraft({ ...draft, hours: draft.hours.filter((_, i) => i !== idx) })} className="px-2 bg-red-600 text-white"><Trash2 className="size-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setDraft({ ...draft, hours: [...draft.hours, { day: "", open: "", close: "" }] })} className="text-xs font-bold uppercase border border-brand-black/10 px-3 py-1 inline-flex items-center gap-1"><Plus className="size-3" /> Add hours row</button>
        </div>
        <Btn disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Settings</Btn>
      </form>
    </Card>
  );
}

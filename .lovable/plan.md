# Punjab Fast Food — Admin Panel + Order Flow

Sequenced across two turns. This turn = admin panel. Next turn = order flow + WhatsApp CTAs.

## Turn 1 — Admin Panel (this turn)

### Database (one migration)

New tables, all with GRANTs + RLS (public SELECT where `active`/`visible = true`; admin-only writes via `has_role`):

- `offers` — title, description, image_key, discount_label, starts_at, ends_at, active, display_order
- `gallery_images` — image_key, caption, display_order, active
- `testimonials` — customer_name, rating (1-5), review, image_key, active, display_order
- `hero_content` — single-row key/value: heading, subheading, cta_text, background_key, banner_key (singleton row, `id = 'default'`)
- `business_settings` — single-row: restaurant_name, logo_key, phone, whatsapp_number, email, address, maps_url, hours (jsonb), delivery_charges, min_order, social (jsonb)

Storage: create public `menu-images` bucket for all uploaded images (menu, hero, offers, gallery, testimonials, logo). RLS: anyone can read; only admins write.

Seed hero + business_settings with the current site's copy and `whatsapp_number = '923017160216'` so nothing goes blank.

### Server layer

- `src/lib/admin.schemas.ts` — Zod schemas: Category, Variant, Addon (exist), plus Offer, Gallery, Testimonial, Hero, BusinessSettings.
- `src/lib/admin.functions.ts` — CRUD server fns for every entity (all `.middleware([requireSupabaseAuth])` + `requireAdmin`). Each returns a fresh dashboard snapshot for cache-free UI.
- `src/lib/admin.server.ts` — extend `loadAdminDashboard` to return everything (categories, variants, addons, offers, gallery, testimonials, hero, settings, orders, stats).
- `src/lib/menu.functions.ts` — extend public `getMenu` to also return hero, offers, gallery, testimonials, business settings so the storefront reads from DB.
- Image upload: server fn `uploadImage` that takes base64 + filename, writes to Supabase Storage via `supabaseAdmin`, returns public URL. Client compresses + base64-encodes before send.

### Admin UI (`src/routes/_authenticated/admin.tsx`)

Tabbed layout matching brand tokens (Anton headings, red/orange/gold, existing card styling):

1. **Dashboard** — Total orders, today's orders, revenue, popular items (aggregated from order items), recent orders list.
2. **Menu** — table of items; row expands to manage variants + addons inline; image upload; category dropdown; active/featured toggles; display order.
3. **Categories** — reorderable list, add/edit/delete, show/hide.
4. **Hero** — form for heading/subheading/CTA + two image uploads.
5. **Offers** — CRUD with image, date pickers, discount label, active toggle.
6. **Gallery** — upload grid, reorder, delete.
7. **Testimonials** — CRUD list.
8. **Settings** — business info form + hours + socials.
9. **Orders** — list with status dropdown (new/preparing/ready/delivered/cancelled).

All forms use react-hook-form + zod, shadcn Dialog/Sheet for edit modals, optimistic-ish refresh via router.invalidate().

### Storefront wiring (minimal — no visual redesign)

`src/routes/index.tsx` reads hero/offers/gallery/testimonials/settings from the extended `getMenu` loader. Falls back to current defaults if a field is empty so the site never looks broken while admin is empty. No layout/animation changes.

## Turn 2 — Order flow + WhatsApp (next message)

- Rename cart CTA to "Customize & Order"; single-price items skip variant step and go straight to a compact order summary sheet.
- Unified `buildWhatsAppMessage(items, settings)` util.
- Two entry points: per-item quick order from the modal + cart-wide checkout button, both open `https://wa.me/{settings.whatsapp_number}?text=...` (defaults to 923017160216).
- Fix every WhatsApp CTA (Hero, floating button, footer, contact, menu, checkout) to use the same helper.
- Verify handlers on desktop + mobile via Playwright screenshots.

### Technical notes

- Storage bucket created via `supabase--storage_create_bucket` tool, not SQL.
- `hero_content` and `business_settings` use a fixed singleton row (`id text primary key default 'default'`) so updates are idempotent upserts.
- All new admin fns require `has_role(auth.uid(),'admin')` — no anon writes anywhere.
- Public SELECT policies gated on `active = true` so hiding an item hides it site-wide instantly.
- Existing `menu_items.category` text column stays for back-compat; new code uses `category_id`.
- Image compression client-side (max 1600px, jpeg 0.85) before upload to keep payloads small.

Approve and I'll build turn 1 end-to-end, then ping you to greenlight turn 2.
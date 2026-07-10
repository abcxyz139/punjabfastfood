
## Goal

Refactor the menu so products, categories, variants, and add-ons all live in the database and are ready to be managed from the admin panel later. Keep the current UI/animations intact — only change what a product card renders when variants exist, and add an option-picker modal.

## Data model (new migration)

Add four tables (all with GRANTs + RLS, admin-only writes, public read for `active = true`):

```text
categories          menu_items (extend)
  id                  category_id  → categories.id  (replaces text `category`)
  name                (keep other columns)
  slug
  display_order
  active

variants                        addons
  id                              id
  menu_item_id → menu_items.id    menu_item_id → menu_items.id
  name (e.g. "Small", "500ml")    name (e.g. "Extra Cheese")
  price (numeric)                 price (numeric)     -- additional
  available (bool)                available (bool)
  display_order                   display_order
```

RLS: anon+authenticated `SELECT` where `active`/`available` is true (or via parent item); admins full write. `menu_items.price` stays as the "base/single price" used when a product has no variants.

## Server layer

- Public read: extend the existing menu fetch (used by home) to return each item with its `variants[]` and `addons[]` (only available ones for the public surface). Admin dashboard loader returns everything, including inactive.
- `createCustomerOrder` (in `src/lib/orders.functions.ts`): accept
  ```ts
  items: [{ menuItemId, variantId?: string, addonIds?: string[], quantity }]
  ```
  Server looks up base price OR variant price, sums selected add-on prices, computes `lineTotal = (unit + addonsTotal) * quantity`, and stores a resolved snapshot in `orders.items` (name, variant name, add-on names, unit price). Client-submitted prices remain ignored.
- Admin server fns: add create/update/delete for `categories`, `variants`, `addons` mirroring the existing `createMenuItem`/`updateMenuItem` pattern. Schemas added in `src/lib/admin.schemas.ts`. (Admin UI wiring is out of scope for this task — just prepare the server surface so the future admin panel plugs in without code changes to the storefront.)

## Storefront UI (no visual redesign)

`src/routes/index.tsx`:

- Replace the hardcoded `menuItems` array with data fetched from the new public loader (categories + items with variants/addons). Category filter chips read from `categories` table.
- Product card logic:
  - `variants.length === 0` → show single price + existing "Add to cart" button (unchanged look).
  - `variants.length >= 1` OR `addons.length >= 1` → same card, but the CTA becomes **"Select Options"** (same button styling, just different label + handler).
  - Price label shows `From $X.XX` when variants exist (cheapest available variant), otherwise the flat price. Same typography.
- New `<OptionsModal>` component (shadcn `Dialog`, styled with existing brand tokens — red/orange/gold, Anton headings, same borders/shadows as current cards):
  - Radio list of variants (name + price, disabled if unavailable).
  - Checkbox list of add-ons (name + `+$X.XX`).
  - Quantity stepper.
  - Live total.
  - "Add to Cart" confirms and calls the updated `addToCart`.
- Cart state (localStorage) shape upgraded to `{ menuItemId, variantId?, addonIds[], quantity }`. Cart panel renders resolved name + selected options; totals recomputed from the loaded menu. A tiny migration step drops any legacy string entries on first load.
- Best Combos + AI recommendations keep working — they read `menuItemId` from the same cart entries.

## Seeding

One-time SQL insert to move the current 8 hardcoded items into `categories` + `menu_items`, with example variants on Pizza (Regular / Large / Family) and Fries (Regular / Large), and example add-ons (Extra Cheese, Extra Chicken, Extra Sauce). Everything else stays single-price so the UI keeps the current "add to cart" button.

## Files touched

- New migration (tables, GRANTs, RLS, seed).
- `src/lib/menu.types.ts` (shared `MenuItem`, `Variant`, `Addon`, `Category`).
- `src/lib/menu.functions.ts` (public `getMenu` server fn).
- `src/lib/orders.functions.ts` (variant/addon-aware pricing).
- `src/lib/admin.schemas.ts` + `src/lib/admin.functions.ts` + `src/lib/admin.server.ts` (CRUD for categories/variants/addons + include them in dashboard snapshot).
- `src/routes/index.tsx` (data-driven menu, new `OptionsModal`, updated cart shape).

No changes to colors, fonts, spacing, section layout, or animations.

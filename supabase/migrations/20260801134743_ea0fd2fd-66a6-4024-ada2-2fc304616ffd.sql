ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS default_product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS variant_label text NOT NULL DEFAULT 'Choose an option',
  ADD COLUMN IF NOT EXISTS addon_label text NOT NULL DEFAULT 'Add-ons';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_default_product_type_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_default_product_type_check
  CHECK (default_product_type IN ('simple', 'variable', 'combo'));

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS addon_label text,
  ADD COLUMN IF NOT EXISTS variant_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_addons integer;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_product_type_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_product_type_check
  CHECK (product_type IN ('simple', 'variable', 'combo'));

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_max_addons_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_max_addons_check
  CHECK (max_addons IS NULL OR (max_addons >= 0 AND max_addons <= 50));

UPDATE public.menu_items m
SET product_type = 'variable'
WHERE m.product_type = 'simple'
  AND EXISTS (SELECT 1 FROM public.menu_item_variants v WHERE v.menu_item_id = m.id);

-- 1. Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT TO anon, authenticated USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update categories" ON public.categories FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Extend menu_items with category_id (keep text `category` for compat)
ALTER TABLE public.menu_items ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);

-- 3. Variants
CREATE TABLE public.menu_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  available boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_variants_menu_item_id ON public.menu_item_variants(menu_item_id);
GRANT SELECT ON public.menu_item_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_variants TO authenticated;
GRANT ALL ON public.menu_item_variants TO service_role;
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available variants" ON public.menu_item_variants FOR SELECT TO anon, authenticated USING (available = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert variants" ON public.menu_item_variants FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update variants" ON public.menu_item_variants FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete variants" ON public.menu_item_variants FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.menu_item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add-ons
CREATE TABLE public.menu_item_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  available boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addons_menu_item_id ON public.menu_item_addons(menu_item_id);
GRANT SELECT ON public.menu_item_addons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_addons TO authenticated;
GRANT ALL ON public.menu_item_addons TO service_role;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available addons" ON public.menu_item_addons FOR SELECT TO anon, authenticated USING (available = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert addons" ON public.menu_item_addons FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update addons" ON public.menu_item_addons FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete addons" ON public.menu_item_addons FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_addons_updated BEFORE UPDATE ON public.menu_item_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Seed categories from existing menu_items and link them
INSERT INTO public.categories (name, slug, display_order)
SELECT DISTINCT category, lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g')), 100
FROM public.menu_items
ON CONFLICT (slug) DO NOTHING;

UPDATE public.menu_items mi
SET category_id = c.id
FROM public.categories c
WHERE c.name = mi.category AND mi.category_id IS NULL;

-- 6. Seed example variants & add-ons
INSERT INTO public.menu_item_variants (menu_item_id, name, price, display_order)
SELECT id, 'Regular', price, 10 FROM public.menu_items WHERE name IN ('Tikka Pizza', 'Royal Pizza XL')
UNION ALL
SELECT id, 'Large', ROUND((price * 1.4)::numeric, 2), 20 FROM public.menu_items WHERE name IN ('Tikka Pizza', 'Royal Pizza XL')
UNION ALL
SELECT id, 'Family Size', ROUND((price * 1.8)::numeric, 2), 30 FROM public.menu_items WHERE name IN ('Tikka Pizza', 'Royal Pizza XL')
UNION ALL
SELECT id, 'Regular', price, 10 FROM public.menu_items WHERE name IN ('Masala Fries', 'Cheesy Fries Deluxe')
UNION ALL
SELECT id, 'Large', ROUND((price * 1.5)::numeric, 2), 20 FROM public.menu_items WHERE name IN ('Masala Fries', 'Cheesy Fries Deluxe');

INSERT INTO public.menu_item_addons (menu_item_id, name, price, display_order)
SELECT id, 'Extra Cheese', 1.50, 10 FROM public.menu_items WHERE name IN ('Tikka Pizza', 'Royal Pizza XL', 'Zinger Punjab', 'Zinger Tower')
UNION ALL
SELECT id, 'Extra Chicken', 2.50, 20 FROM public.menu_items WHERE name IN ('Zinger Punjab', 'Zinger Tower', 'Paratha Wrap', 'Lahori Roll')
UNION ALL
SELECT id, 'Extra Sauce', 0.75, 30 FROM public.menu_items WHERE name IN ('Zinger Punjab', 'Zinger Tower', 'Paratha Wrap', 'Lahori Roll', 'Masala Fries', 'Cheesy Fries Deluxe')
UNION ALL
SELECT id, 'Stuffed Crust', 3.00, 40 FROM public.menu_items WHERE name IN ('Tikka Pizza', 'Royal Pizza XL');

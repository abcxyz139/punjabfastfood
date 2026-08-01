CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  promo_type text NOT NULL DEFAULT 'percent',
  headline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_key text NOT NULL DEFAULT '',
  badge_label text NOT NULL DEFAULT '',
  target_scope text NOT NULL DEFAULT 'store',
  target_category_ids uuid[] NOT NULL DEFAULT '{}',
  target_menu_item_ids uuid[] NOT NULL DEFAULT '{}',
  target_variant_ids uuid[] NOT NULL DEFAULT '{}',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  buy_quantity integer NOT NULL DEFAULT 0,
  get_quantity integer NOT NULL DEFAULT 0,
  get_menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  get_discount_percent numeric NOT NULL DEFAULT 0,
  bundle_price numeric,
  free_delivery boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  start_time time,
  end_time time,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  per_customer_limit integer,
  stock_limit integer,
  campaign text NOT NULL DEFAULT '',
  season text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 100,
  stack_mode text NOT NULL DEFAULT 'stackable',
  applicable_customer_ids uuid[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT true,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active promotions" ON public.promotions
  FOR SELECT USING (active = true);
CREATE POLICY "admins read all promotions" ON public.promotions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins write promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX promotions_active_priority_idx ON public.promotions (active, priority);
CREATE INDEX promotions_schedule_idx ON public.promotions (starts_at, ends_at);

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.promotion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  role text NOT NULL DEFAULT 'bundle',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotion_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_items TO authenticated;
GRANT ALL ON public.promotion_items TO service_role;

ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read promotion items" ON public.promotion_items
  FOR SELECT USING (true);
CREATE POLICY "admins write promotion items" ON public.promotion_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX promotion_items_promotion_idx ON public.promotion_items (promotion_id);
CREATE INDEX promotion_items_menu_item_idx ON public.promotion_items (menu_item_id);

CREATE TABLE public.promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  discount_amount numeric NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotion_redemptions TO authenticated;
GRANT ALL ON public.promotion_redemptions TO service_role;

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read redemptions" ON public.promotion_redemptions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX promotion_redemptions_promotion_idx ON public.promotion_redemptions (promotion_id);
CREATE INDEX promotion_redemptions_order_idx ON public.promotion_redemptions (order_id);
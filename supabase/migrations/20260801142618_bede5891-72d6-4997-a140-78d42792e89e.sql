-- ============ loyalty_programs ============
CREATE TABLE public.loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  earn_type text NOT NULL DEFAULT 'product' CHECK (earn_type IN ('product','category','order','amount')),
  target_menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  target_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  threshold numeric NOT NULL DEFAULT 5 CHECK (threshold > 0),
  reward_type text NOT NULL DEFAULT 'free_product' CHECK (reward_type IN ('percent','fixed','free_product','free_delivery','points')),
  reward_value numeric NOT NULL DEFAULT 0 CHECK (reward_value >= 0),
  reward_menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  reward_label text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  usage_limit_per_customer integer,
  expiry_mode text NOT NULL DEFAULT 'never' CHECK (expiry_mode IN ('never','days','date')),
  expiry_days integer,
  expires_at timestamptz,
  stack_mode text NOT NULL DEFAULT 'stack_all' CHECK (stack_mode IN ('stack_all','offers_only','promotions_only','exclusive')),
  campaign text NOT NULL DEFAULT '',
  applicable_customer_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs TO authenticated;
GRANT ALL ON public.loyalty_programs TO service_role;

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active loyalty programs"
  ON public.loyalty_programs FOR SELECT
  USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins write loyalty programs"
  ON public.loyalty_programs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_loyalty_programs_active ON public.loyalty_programs(active, priority);

CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ loyalty_rewards (issued/unlocked) ============
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked','redeemed','expired')),
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  reward_label text NOT NULL DEFAULT '',
  expires_at timestamptz,
  redeemed_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_rewards TO authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers read own rewards"
  ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_loyalty_rewards_user ON public.loyalty_rewards(user_id, status);
CREATE INDEX idx_loyalty_rewards_program ON public.loyalty_rewards(program_id, status);

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ loyalty_notifications ============
CREATE TABLE public.loyalty_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'progress' CHECK (kind IN ('progress','unlocked','redeemed','expiring')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.loyalty_notifications TO authenticated;
GRANT ALL ON public.loyalty_notifications TO service_role;

ALTER TABLE public.loyalty_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers read own notifications"
  ON public.loyalty_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "customers mark own notifications read"
  ON public.loyalty_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_loyalty_notifications_user ON public.loyalty_notifications(user_id, created_at DESC);

-- ============ customer_favorites ============
CREATE TABLE public.customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_item_id)
);

GRANT SELECT, INSERT, DELETE ON public.customer_favorites TO authenticated;
GRANT ALL ON public.customer_favorites TO service_role;

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers manage own favorites"
  ON public.customer_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_customer_favorites_user ON public.customer_favorites(user_id);

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed_message text NOT NULL DEFAULT 'We are currently closed. Please order during opening hours.',
  ADD COLUMN IF NOT EXISTS announcement text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_secondary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_radius_km numeric NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS quick_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meal_upgrade_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['new'::text, 'accepted'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text]));
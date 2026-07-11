
-- OFFERS
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_key text NOT NULL DEFAULT '',
  discount_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active offers" ON public.offers FOR SELECT USING (active = true);
CREATE POLICY "admins read all offers" ON public.offers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write offers" ON public.offers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GALLERY
CREATE TABLE public.gallery_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_key text NOT NULL,
  caption text,
  display_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_images TO anon, authenticated;
GRANT ALL ON public.gallery_images TO service_role;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active gallery" ON public.gallery_images FOR SELECT USING (active = true);
CREATE POLICY "admins read all gallery" ON public.gallery_images FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write gallery" ON public.gallery_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_gallery_updated_at BEFORE UPDATE ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TESTIMONIALS
CREATE TABLE public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review text NOT NULL,
  image_key text,
  active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active testimonials" ON public.testimonials FOR SELECT USING (active = true);
CREATE POLICY "admins read all testimonials" ON public.testimonials FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HERO singleton
CREATE TABLE public.hero_content (
  id text NOT NULL PRIMARY KEY DEFAULT 'default',
  heading text NOT NULL DEFAULT '',
  subheading text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Order Now',
  background_key text NOT NULL DEFAULT '',
  banner_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_content TO anon, authenticated;
GRANT ALL ON public.hero_content TO service_role;
ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hero" ON public.hero_content FOR SELECT USING (true);
CREATE POLICY "admins write hero" ON public.hero_content FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_hero_updated_at BEFORE UPDATE ON public.hero_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hero_content (id, heading, subheading, cta_text)
VALUES ('default', 'Bold Flavors. Punjab Streets.', 'Fresh-fried, flame-kissed fast food built for cravings that don''t wait.', 'Order Now')
ON CONFLICT (id) DO NOTHING;

-- BUSINESS SETTINGS singleton
CREATE TABLE public.business_settings (
  id text NOT NULL PRIMARY KEY DEFAULT 'default',
  restaurant_name text NOT NULL DEFAULT 'Punjab Fast Food',
  logo_key text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '923017160216',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  maps_url text NOT NULL DEFAULT '',
  hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_charges numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_settings TO anon, authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.business_settings FOR SELECT USING (true);
CREATE POLICY "admins write settings" ON public.business_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_settings (id, restaurant_name, whatsapp_number, phone, email, address, hours, social)
VALUES (
  'default',
  'Punjab Fast Food',
  '923017160216',
  '+92 301 7160216',
  'hello@punjabfastfood.com',
  'Main Boulevard, Lahore, Pakistan',
  '[{"day":"Mon-Sun","open":"11:00","close":"02:00"}]'::jsonb,
  '{"instagram":"","facebook":"","tiktok":""}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

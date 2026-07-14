-- Ensure all remaining admin policies use private.has_role (not public.has_role).

-- offers
DROP POLICY IF EXISTS "admins read all offers" ON public.offers;
DROP POLICY IF EXISTS "admins write offers" ON public.offers;
CREATE POLICY "admins read all offers" ON public.offers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write offers" ON public.offers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- gallery_images
DROP POLICY IF EXISTS "admins read all gallery" ON public.gallery_images;
DROP POLICY IF EXISTS "admins write gallery" ON public.gallery_images;
CREATE POLICY "admins read all gallery" ON public.gallery_images
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write gallery" ON public.gallery_images
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- testimonials
DROP POLICY IF EXISTS "admins read all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "admins write testimonials" ON public.testimonials;
CREATE POLICY "admins read all testimonials" ON public.testimonials
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- hero_content
DROP POLICY IF EXISTS "admins write hero" ON public.hero_content;
CREATE POLICY "admins write hero" ON public.hero_content
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- business_settings
DROP POLICY IF EXISTS "admins write settings" ON public.business_settings;
CREATE POLICY "admins write settings" ON public.business_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- storage.objects (bucket restaurant-media)
DROP POLICY IF EXISTS "admins upload media" ON storage.objects;
DROP POLICY IF EXISTS "admins update media" ON storage.objects;
DROP POLICY IF EXISTS "admins delete media" ON storage.objects;
DROP POLICY IF EXISTS "admins read media" ON storage.objects;

CREATE POLICY "admins upload media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'restaurant-media' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'restaurant-media' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'restaurant-media' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'restaurant-media' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'restaurant-media' AND private.has_role(auth.uid(), 'admin'));

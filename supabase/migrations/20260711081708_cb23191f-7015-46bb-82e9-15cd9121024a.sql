
CREATE POLICY "admins upload media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'restaurant-media' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins update media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'restaurant-media' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'restaurant-media' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins delete media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'restaurant-media' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins read media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'restaurant-media' AND public.has_role(auth.uid(),'admin'));

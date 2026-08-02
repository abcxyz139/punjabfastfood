CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_active_order ON public.menu_items (active, display_order);
CREATE INDEX IF NOT EXISTS idx_offers_active_order ON public.offers (active, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_active_order ON public.gallery_images (active, display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_active_order ON public.testimonials (active, display_order);
CREATE INDEX IF NOT EXISTS idx_promotions_active_priority ON public.promotions (active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user ON public.promotion_redemptions (user_id, promotion_id);
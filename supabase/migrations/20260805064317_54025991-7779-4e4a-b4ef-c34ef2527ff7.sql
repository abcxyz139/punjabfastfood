ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS gallery_keys text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '';

-- Backfill a URL-friendly slug from the product name, de-duplicated by a short id suffix.
UPDATE public.menu_items m
SET slug = base.candidate
FROM (
  SELECT id,
    CASE WHEN cnt > 1 THEN s || '-' || left(replace(id::text, '-', ''), 4) ELSE s END AS candidate
  FROM (
    SELECT id,
      nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), '') AS s,
      count(*) OVER (PARTITION BY nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), '')) AS cnt
    FROM public.menu_items
  ) x
) base
WHERE m.id = base.id AND (m.slug IS NULL OR m.slug = '');

UPDATE public.menu_items
SET slug = 'item-' || left(replace(id::text, '-', ''), 8)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS menu_items_slug_key ON public.menu_items (slug);
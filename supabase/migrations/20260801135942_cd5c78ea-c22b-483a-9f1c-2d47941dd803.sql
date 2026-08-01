ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS spice_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS available_days integer[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS available_from time without time zone,
  ADD COLUMN IF NOT EXISTS available_until time without time zone;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_spice_level_check;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_spice_level_check CHECK (spice_level >= 0 AND spice_level <= 3);

CREATE INDEX IF NOT EXISTS menu_items_badges_idx ON public.menu_items USING gin (badges);
CREATE INDEX IF NOT EXISTS menu_items_search_keywords_idx ON public.menu_items USING gin (search_keywords);
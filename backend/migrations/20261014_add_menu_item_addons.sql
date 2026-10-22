ALTER TABLE public.restaurant_menu_items
ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb;

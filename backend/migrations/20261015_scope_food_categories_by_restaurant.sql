ALTER TABLE public.food_categories
ADD COLUMN IF NOT EXISTS restaurant_id UUID;

CREATE INDEX IF NOT EXISTS food_categories_restaurant_id_idx
ON public.food_categories (restaurant_id);

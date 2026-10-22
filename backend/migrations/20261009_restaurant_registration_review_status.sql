ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS submitted_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason JSONB NOT NULL DEFAULT '[]'::jsonb;

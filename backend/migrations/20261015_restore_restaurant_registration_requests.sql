DO $$
DECLARE
  status_schema TEXT;
  status_type TEXT;
BEGIN
  FOR status_schema, status_type IN
    SELECT type_namespace.nspname, status_enum.typname
    FROM pg_attribute AS status_column
    JOIN pg_class AS restaurant_table
      ON restaurant_table.oid = status_column.attrelid
    JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = restaurant_table.relnamespace
    JOIN pg_type AS status_enum
      ON status_enum.oid = status_column.atttypid
    JOIN pg_namespace AS type_namespace
      ON type_namespace.oid = status_enum.typnamespace
    WHERE table_namespace.nspname = 'public'
      AND restaurant_table.relname = 'restaurants'
      AND status_column.attname IN (
        'admin_restaurant_status',
        'owner_restaurant_status'
      )
      AND status_column.attnum > 0
      AND NOT status_column.attisdropped
      AND status_enum.typtype = 'e'
  LOOP
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L',
      status_schema,
      status_type,
      'ACCEPTED'
    );
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.restaurant_profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  restaurant_record_id UUID,
  requested_by UUID,
  requested_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_type TEXT NOT NULL DEFAULT 'profile_change'
    CHECK (request_type IN ('profile_change', 'registration')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.restaurant_profile_change_requests
  ADD COLUMN IF NOT EXISTS requested_by UUID,
  ADD COLUMN IF NOT EXISTS restaurant_record_id UUID,
  ADD COLUMN IF NOT EXISTS requested_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'profile_change',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.restaurant_profile_change_requests
  ALTER COLUMN requested_by DROP NOT NULL;

DO $$
DECLARE
  restaurant_fk RECORD;
BEGIN
  FOR restaurant_fk IN
    SELECT table_constraint.constraint_name
    FROM information_schema.table_constraints AS table_constraint
    JOIN information_schema.key_column_usage AS key_column
      ON key_column.constraint_name = table_constraint.constraint_name
      AND key_column.constraint_schema = table_constraint.constraint_schema
    JOIN information_schema.constraint_column_usage AS referenced_column
      ON referenced_column.constraint_name = table_constraint.constraint_name
      AND referenced_column.constraint_schema = table_constraint.constraint_schema
    WHERE table_constraint.constraint_schema = 'public'
      AND table_constraint.table_name = 'restaurant_profile_change_requests'
      AND table_constraint.constraint_type = 'FOREIGN KEY'
      AND key_column.column_name = 'restaurant_id'
      AND referenced_column.table_name = 'restaurants'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.restaurant_profile_change_requests DROP CONSTRAINT %I',
      restaurant_fk.constraint_name
    );
  END LOOP;
END;
$$;

UPDATE public.restaurant_profile_change_requests AS request
SET restaurant_record_id = restaurant.id
FROM public.restaurants AS restaurant
WHERE request.request_type = 'profile_change'
  AND restaurant.restaurant_id = request.restaurant_id
  AND request.restaurant_record_id IS DISTINCT FROM restaurant.id;

UPDATE public.restaurant_profile_change_requests AS request
SET restaurant_record_id = restaurant.id
FROM public.restaurants AS restaurant
WHERE request.request_type = 'profile_change'
  AND restaurant.id = request.restaurant_id
  AND request.restaurant_record_id IS NULL;

UPDATE public.restaurant_profile_change_requests AS request
SET restaurant_record_id = restaurant.id
FROM public.restaurants AS restaurant
WHERE request.request_type = 'registration'
  AND restaurant.id = request.restaurant_id
  AND request.restaurant_record_id IS DISTINCT FROM restaurant.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_profile_change_requests_restaurant_record_id_fkey'
      AND conrelid = 'public.restaurant_profile_change_requests'::regclass
  ) THEN
    ALTER TABLE public.restaurant_profile_change_requests
      ADD CONSTRAINT restaurant_profile_change_requests_restaurant_record_id_fkey
      FOREIGN KEY (restaurant_record_id)
      REFERENCES public.restaurants(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

INSERT INTO public.restaurant_profile_change_requests (
  restaurant_id,
  restaurant_record_id,
  requested_changes,
  previous_values,
  request_type,
  status,
  created_at,
  updated_at
)
SELECT
  restaurant.id,
  restaurant.id,
  to_jsonb(restaurant) - 'password_hash' - 'reject_reason',
  '{}'::jsonb,
  'registration',
  'pending',
  COALESCE(restaurant.submitted_time, restaurant.created_at, NOW()),
  COALESCE(restaurant.submitted_time, restaurant.updated_at, NOW())
FROM public.restaurants AS restaurant
WHERE UPPER(restaurant.admin_restaurant_status::text) = 'PENDING'
  AND NOT EXISTS (
    SELECT 1
    FROM public.restaurant_profile_change_requests AS request
    WHERE request.restaurant_record_id = restaurant.id
      AND request.request_type = 'registration'
      AND request.status = 'pending'
  );

CREATE INDEX IF NOT EXISTS restaurant_profile_change_requests_restaurant_idx
  ON public.restaurant_profile_change_requests (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS restaurant_profile_change_requests_status_idx
  ON public.restaurant_profile_change_requests (request_type, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_profile_change_requests_one_pending_idx
  ON public.restaurant_profile_change_requests (restaurant_id, request_type)
  WHERE status = 'pending';

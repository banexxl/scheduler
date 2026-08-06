-- Migration: Service Resources
-- Junction table assigning resources to services with optional overrides.
-- Includes tenant-consistency trigger, RLS policies, and atomic RPCs.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.service_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  duration_override_minutes integer NULL,
  price_override numeric(12,2) NULL,
  currency_override text NULL,
  buffer_before_override_minutes integer NULL,
  buffer_after_override_minutes integer NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one assignment per tenant, service, resource
ALTER TABLE public.service_resources
  ADD CONSTRAINT uq_service_resources_tenant_service_resource
    UNIQUE (tenant_id, service_id, resource_id);

-- Value constraints
ALTER TABLE public.service_resources
  ADD CONSTRAINT sr_sort_order_non_negative CHECK (sort_order >= 0),
  ADD CONSTRAINT sr_duration_override_range CHECK (
    duration_override_minutes IS NULL OR duration_override_minutes BETWEEN 5 AND 1440
  ),
  ADD CONSTRAINT sr_price_override_non_negative CHECK (
    price_override IS NULL OR price_override >= 0
  ),
  ADD CONSTRAINT sr_currency_override_format CHECK (
    currency_override IS NULL OR currency_override ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT sr_buffer_before_override_range CHECK (
    buffer_before_override_minutes IS NULL OR buffer_before_override_minutes BETWEEN 0 AND 1440
  ),
  ADD CONSTRAINT sr_buffer_after_override_range CHECK (
    buffer_after_override_minutes IS NULL OR buffer_after_override_minutes BETWEEN 0 AND 1440
  ),
  ADD CONSTRAINT sr_currency_requires_price CHECK (
    currency_override IS NULL OR price_override IS NOT NULL
  );

COMMENT ON TABLE public.service_resources IS
  'Assigns resources to services. Means the resource is qualified to perform the service. Does not imply availability.';

-- ============================================================
-- 2. Tenant-Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_service_resource_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify service belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id
      AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to this tenant';
  END IF;

  -- Verify resource belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = NEW.resource_id
      AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to this tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_service_resource_tenant
  BEFORE INSERT OR UPDATE ON public.service_resources
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_resource_tenant();

-- ============================================================
-- 3. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_service_resources_updated_at
  BEFORE UPDATE ON public.service_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX idx_service_resources_tenant ON public.service_resources (tenant_id);
CREATE INDEX idx_service_resources_service ON public.service_resources (service_id);
CREATE INDEX idx_service_resources_resource ON public.service_resources (resource_id);
CREATE INDEX idx_service_resources_tenant_service ON public.service_resources (tenant_id, service_id);
CREATE INDEX idx_service_resources_tenant_resource ON public.service_resources (tenant_id, resource_id);
CREATE INDEX idx_service_resources_tenant_active ON public.service_resources (tenant_id, is_active);
CREATE INDEX idx_service_resources_tenant_service_sort ON public.service_resources (tenant_id, service_id, sort_order);
CREATE INDEX idx_service_resources_tenant_resource_sort ON public.service_resources (tenant_id, resource_id, sort_order);

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr_select_member"
  ON public.service_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_resources.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "sr_insert_owner_admin"
  ON public.service_resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_resources.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sr_update_owner_admin"
  ON public.service_resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_resources.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sr_delete_owner_admin"
  ON public.service_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_resources.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 6. set_service_resources RPC
-- Atomically replaces the resource assignment set for a service.
-- Accepts JSONB array of assignment objects.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_service_resources(
  p_tenant_id uuid,
  p_service_id uuid,
  p_assignments jsonb
)
RETURNS SETOF public.service_resources
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  asg jsonb;
  res_id uuid;
  res_ids uuid[] := '{}';
  dup_check uuid[];
  i integer := 0;
BEGIN
  -- 1. Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- 2. Verify service belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = p_service_id
      AND s.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Service not found in this business';
  END IF;

  -- 3. Handle NULL or empty array: remove all assignments
  IF p_assignments IS NULL OR jsonb_array_length(p_assignments) = 0 THEN
    DELETE FROM public.service_resources
    WHERE service_id = p_service_id AND tenant_id = p_tenant_id;

    RETURN QUERY SELECT * FROM public.service_resources WHERE false;
    RETURN;
  END IF;

  -- 4. Extract and validate resource IDs, check duplicates
  FOR asg IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    res_id := (asg->>'resource_id')::uuid;
    IF res_id IS NULL THEN
      RAISE EXCEPTION 'Each assignment must include a valid resource_id';
    END IF;
    res_ids := array_append(res_ids, res_id);
  END LOOP;

  SELECT array_agg(DISTINCT rid) INTO dup_check FROM unnest(res_ids) AS rid;
  IF array_length(dup_check, 1) != array_length(res_ids, 1) THEN
    RAISE EXCEPTION 'Duplicate resource IDs are not allowed';
  END IF;

  -- 5. Verify all resources belong to the tenant
  IF EXISTS (
    SELECT 1 FROM unnest(res_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = rid AND r.tenant_id = p_tenant_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more resources do not belong to this business';
  END IF;

  -- 6. Validate override fields
  FOR asg IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    -- Duration override
    IF asg->>'duration_override_minutes' IS NOT NULL AND (asg->>'duration_override_minutes')::int NOT BETWEEN 5 AND 1440 THEN
      RAISE EXCEPTION 'Duration override must be between 5 and 1440 minutes';
    END IF;
    -- Price override
    IF asg->>'price_override' IS NOT NULL AND (asg->>'price_override')::numeric < 0 THEN
      RAISE EXCEPTION 'Price override cannot be negative';
    END IF;
    -- Currency override requires price
    IF asg->>'currency_override' IS NOT NULL AND asg->>'price_override' IS NULL THEN
      RAISE EXCEPTION 'Currency override requires a price override';
    END IF;
    -- Currency format
    IF asg->>'currency_override' IS NOT NULL AND NOT (asg->>'currency_override' ~ '^[A-Z]{3}$') THEN
      RAISE EXCEPTION 'Currency override must be exactly 3 uppercase letters';
    END IF;
    -- Buffer overrides
    IF asg->>'buffer_before_override_minutes' IS NOT NULL AND (asg->>'buffer_before_override_minutes')::int NOT BETWEEN 0 AND 1440 THEN
      RAISE EXCEPTION 'Buffer before override must be between 0 and 1440 minutes';
    END IF;
    IF asg->>'buffer_after_override_minutes' IS NOT NULL AND (asg->>'buffer_after_override_minutes')::int NOT BETWEEN 0 AND 1440 THEN
      RAISE EXCEPTION 'Buffer after override must be between 0 and 1440 minutes';
    END IF;
  END LOOP;

  -- 7. Remove assignments no longer in the set
  DELETE FROM public.service_resources
  WHERE service_id = p_service_id
    AND tenant_id = p_tenant_id
    AND resource_id != ALL(res_ids);

  -- 8. Upsert assignments
  i := 0;
  FOR asg IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    res_id := (asg->>'resource_id')::uuid;

    INSERT INTO public.service_resources (
      tenant_id, service_id, resource_id, is_active,
      duration_override_minutes, price_override, currency_override,
      buffer_before_override_minutes, buffer_after_override_minutes, sort_order
    )
    VALUES (
      p_tenant_id, p_service_id, res_id,
      COALESCE((asg->>'is_active')::boolean, true),
      (asg->>'duration_override_minutes')::integer,
      (asg->>'price_override')::numeric,
      asg->>'currency_override',
      (asg->>'buffer_before_override_minutes')::integer,
      (asg->>'buffer_after_override_minutes')::integer,
      COALESCE((asg->>'sort_order')::integer, i)
    )
    ON CONFLICT (tenant_id, service_id, resource_id)
    DO UPDATE SET
      is_active = COALESCE((asg->>'is_active')::boolean, true),
      duration_override_minutes = (asg->>'duration_override_minutes')::integer,
      price_override = (asg->>'price_override')::numeric,
      currency_override = asg->>'currency_override',
      buffer_before_override_minutes = (asg->>'buffer_before_override_minutes')::integer,
      buffer_after_override_minutes = (asg->>'buffer_after_override_minutes')::integer,
      sort_order = COALESCE((asg->>'sort_order')::integer, i);

    i := i + 1;
  END LOOP;

  -- 9. Return the final assignment set
  RETURN QUERY
    SELECT * FROM public.service_resources
    WHERE service_id = p_service_id
      AND tenant_id = p_tenant_id
    ORDER BY sort_order, created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_service_resources(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_service_resources(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_service_resources(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.set_service_resources(uuid, uuid, jsonb) IS
  'Atomically replaces the set of resource assignments for a service. Supports overrides via JSONB input.';

-- ============================================================
-- 7. reorder_service_resources RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_service_resources(
  p_tenant_id uuid,
  p_service_id uuid,
  p_ordered_assignment_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  asg_id uuid;
  asg_tenant uuid;
  asg_service uuid;
  existing_count integer;
  dup_check uuid[];
BEGIN
  -- 1. Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- 2. Verify service belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = p_service_id AND s.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Service not found in this business';
  END IF;

  -- 3. Handle empty array
  IF p_ordered_assignment_ids IS NULL OR array_length(p_ordered_assignment_ids, 1) IS NULL THEN
    RETURN true;
  END IF;

  -- 4. Reject duplicates
  SELECT array_agg(DISTINCT aid) INTO dup_check FROM unnest(p_ordered_assignment_ids) AS aid;
  IF array_length(dup_check, 1) != array_length(p_ordered_assignment_ids, 1) THEN
    RAISE EXCEPTION 'Duplicate assignment IDs are not allowed';
  END IF;

  -- 5. Verify completeness
  SELECT count(*) INTO existing_count
  FROM public.service_resources
  WHERE tenant_id = p_tenant_id AND service_id = p_service_id;

  IF existing_count != array_length(p_ordered_assignment_ids, 1) THEN
    RAISE EXCEPTION 'Must include all assignments for this service (expected %, got %)',
      existing_count, array_length(p_ordered_assignment_ids, 1);
  END IF;

  -- 6. Verify each assignment and update sort_order
  FOR i IN 1..array_length(p_ordered_assignment_ids, 1) LOOP
    asg_id := p_ordered_assignment_ids[i];

    SELECT sr.tenant_id, sr.service_id INTO asg_tenant, asg_service
    FROM public.service_resources sr
    WHERE sr.id = asg_id;

    IF asg_tenant IS NULL OR asg_tenant != p_tenant_id THEN
      RAISE EXCEPTION 'Assignment not found or does not belong to this business';
    END IF;

    IF asg_service != p_service_id THEN
      RAISE EXCEPTION 'Assignment does not belong to the specified service';
    END IF;

    UPDATE public.service_resources SET sort_order = i - 1 WHERE id = asg_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_service_resources(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_service_resources(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_service_resources(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.reorder_service_resources(uuid, uuid, uuid[]) IS
  'Atomically reorders resource assignments within a service.';

-- ============================================================
-- 8. create_service_with_assignments RPC
-- Atomically creates a service with location and resource assignments.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_service_with_assignments(
  p_tenant_id uuid,
  p_service_category_id uuid DEFAULT NULL,
  p_name text DEFAULT '',
  p_slug text DEFAULT '',
  p_description text DEFAULT NULL,
  p_duration_minutes integer DEFAULT 30,
  p_price numeric DEFAULT 0,
  p_currency text DEFAULT 'EUR',
  p_buffer_before_minutes integer DEFAULT 0,
  p_buffer_after_minutes integer DEFAULT 0,
  p_is_active boolean DEFAULT true,
  p_sort_order integer DEFAULT 0,
  p_location_ids uuid[] DEFAULT '{}',
  p_resource_assignments jsonb DEFAULT '[]'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_service_id uuid;
  loc_id uuid;
  asg jsonb;
  res_id uuid;
  res_ids uuid[] := '{}';
  dup_check uuid[];
  i integer;
BEGIN
  -- 1. Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- 2. Verify category if provided
  IF p_service_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.service_categories sc
      WHERE sc.id = p_service_category_id AND sc.tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Service category does not belong to this tenant';
    END IF;
  END IF;

  -- 3. Verify all locations belong to tenant
  IF array_length(p_location_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_location_ids) AS lid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.locations l WHERE l.id = lid AND l.tenant_id = p_tenant_id
      )
    ) THEN
      RAISE EXCEPTION 'One or more locations do not belong to this business';
    END IF;
  END IF;

  -- 4. Validate resource assignments
  IF p_resource_assignments IS NOT NULL AND jsonb_array_length(p_resource_assignments) > 0 THEN
    FOR asg IN SELECT * FROM jsonb_array_elements(p_resource_assignments) LOOP
      res_id := (asg->>'resource_id')::uuid;
      IF res_id IS NULL THEN
        RAISE EXCEPTION 'Each resource assignment must include a valid resource_id';
      END IF;
      res_ids := array_append(res_ids, res_id);

      -- Validate overrides
      IF asg->>'duration_override_minutes' IS NOT NULL AND (asg->>'duration_override_minutes')::int NOT BETWEEN 5 AND 1440 THEN
        RAISE EXCEPTION 'Duration override must be between 5 and 1440 minutes';
      END IF;
      IF asg->>'price_override' IS NOT NULL AND (asg->>'price_override')::numeric < 0 THEN
        RAISE EXCEPTION 'Price override cannot be negative';
      END IF;
      IF asg->>'currency_override' IS NOT NULL AND asg->>'price_override' IS NULL THEN
        RAISE EXCEPTION 'Currency override requires a price override';
      END IF;
      IF asg->>'currency_override' IS NOT NULL AND NOT (asg->>'currency_override' ~ '^[A-Z]{3}$') THEN
        RAISE EXCEPTION 'Currency override must be exactly 3 uppercase letters';
      END IF;
      IF asg->>'buffer_before_override_minutes' IS NOT NULL AND (asg->>'buffer_before_override_minutes')::int NOT BETWEEN 0 AND 1440 THEN
        RAISE EXCEPTION 'Buffer before override must be between 0 and 1440';
      END IF;
      IF asg->>'buffer_after_override_minutes' IS NOT NULL AND (asg->>'buffer_after_override_minutes')::int NOT BETWEEN 0 AND 1440 THEN
        RAISE EXCEPTION 'Buffer after override must be between 0 and 1440';
      END IF;
    END LOOP;

    -- Check for duplicate resource IDs
    SELECT array_agg(DISTINCT rid) INTO dup_check FROM unnest(res_ids) AS rid;
    IF array_length(dup_check, 1) != array_length(res_ids, 1) THEN
      RAISE EXCEPTION 'Duplicate resource IDs are not allowed';
    END IF;

    -- Verify all resources belong to tenant
    IF EXISTS (
      SELECT 1 FROM unnest(res_ids) AS rid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.resources r WHERE r.id = rid AND r.tenant_id = p_tenant_id
      )
    ) THEN
      RAISE EXCEPTION 'One or more resources do not belong to this business';
    END IF;
  END IF;

  -- 5. Insert the service
  INSERT INTO public.services (
    tenant_id, service_category_id, name, slug, description,
    duration_minutes, price, currency,
    buffer_before_minutes, buffer_after_minutes,
    is_active, sort_order
  )
  VALUES (
    p_tenant_id, p_service_category_id, trim(p_name), lower(trim(p_slug)),
    CASE WHEN trim(COALESCE(p_description, '')) = '' THEN NULL ELSE trim(p_description) END,
    p_duration_minutes, p_price, p_currency,
    p_buffer_before_minutes, p_buffer_after_minutes,
    p_is_active, p_sort_order
  )
  RETURNING id INTO new_service_id;

  -- 6. Insert location assignments
  IF array_length(p_location_ids, 1) > 0 THEN
    FOREACH loc_id IN ARRAY p_location_ids LOOP
      INSERT INTO public.service_locations (tenant_id, service_id, location_id, is_active, sort_order)
      VALUES (p_tenant_id, new_service_id, loc_id, true, 0);
    END LOOP;
  END IF;

  -- 7. Insert resource assignments
  IF p_resource_assignments IS NOT NULL AND jsonb_array_length(p_resource_assignments) > 0 THEN
    i := 0;
    FOR asg IN SELECT * FROM jsonb_array_elements(p_resource_assignments) LOOP
      res_id := (asg->>'resource_id')::uuid;

      INSERT INTO public.service_resources (
        tenant_id, service_id, resource_id, is_active,
        duration_override_minutes, price_override, currency_override,
        buffer_before_override_minutes, buffer_after_override_minutes, sort_order
      )
      VALUES (
        p_tenant_id, new_service_id, res_id,
        COALESCE((asg->>'is_active')::boolean, true),
        (asg->>'duration_override_minutes')::integer,
        (asg->>'price_override')::numeric,
        asg->>'currency_override',
        (asg->>'buffer_before_override_minutes')::integer,
        (asg->>'buffer_after_override_minutes')::integer,
        COALESCE((asg->>'sort_order')::integer, i)
      );

      i := i + 1;
    END LOOP;
  END IF;

  RETURN new_service_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_with_assignments(uuid, uuid, text, text, text, integer, numeric, text, integer, integer, boolean, integer, uuid[], jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_service_with_assignments(uuid, uuid, text, text, text, integer, numeric, text, integer, integer, boolean, integer, uuid[], jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_service_with_assignments(uuid, uuid, text, text, text, integer, numeric, text, integer, integer, boolean, integer, uuid[], jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_service_with_assignments(uuid, uuid, text, text, text, integer, numeric, text, integer, integer, boolean, integer, uuid[], jsonb) IS
  'Atomically creates a service with location and resource assignments in one transaction.';

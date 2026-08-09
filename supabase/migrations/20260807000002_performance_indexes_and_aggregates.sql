-- Milestone 10.2 — Performance Indexes and Aggregation Functions
-- ================================================================

-- ─── Performance Indexes ─────────────────────────────────────────────────────

-- Appointment hot-path indexes for analytics, calendar, and list queries
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_starts_at
  ON appointments (tenant_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status_starts_at
  ON appointments (tenant_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_customer_starts_at
  ON appointments (tenant_id, customer_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_service_starts_at
  ON appointments (tenant_id, service_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_resource_starts_at
  ON appointments (tenant_id, resource_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_location_starts_at
  ON appointments (tenant_id, location_id, starts_at);

-- Notification outbox worker index (pending items due for processing)
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON notification_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'retrying');

-- Appointment reminders worker index (due reminders)
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due
  ON appointment_reminders (status, scheduled_for)
  WHERE status = 'pending';

-- Waitlist entries active index
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_active
  ON waitlist_entries (tenant_id, service_id, status, preferred_date_from)
  WHERE status = 'active';

-- Customer account tenant links for cross-tenant queries
CREATE INDEX IF NOT EXISTS idx_customer_account_tenant_links_account_linked
  ON customer_account_tenant_links (customer_account_id, link_status)
  WHERE link_status = 'linked';

-- Customer list: upcoming appointment detection
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_customer_status_future
  ON appointments (tenant_id, customer_id, status, starts_at)
  WHERE status NOT IN ('cancelled', 'completed', 'no_show');

-- ─── Dashboard Analytics Aggregation RPC ─────────────────────────────────────

CREATE OR REPLACE FUNCTION get_dashboard_analytics_summary(
  p_tenant_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ,
  p_comp_start TIMESTAMPTZ DEFAULT NULL,
  p_comp_end TIMESTAMPTZ DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_period JSONB;
  v_comp JSONB;
  v_services JSONB;
  v_resources JSONB;
  v_locations JSONB;
  v_sources JSONB;
  v_statuses JSONB;
  v_trend JSONB;
  v_new_customers INT;
  v_returning_customers INT;
BEGIN
  -- Period summary aggregates
  SELECT jsonb_build_object(
    'total', COUNT(*)::INT,
    'completed', COUNT(*) FILTER (WHERE status = 'completed')::INT,
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')::INT,
    'no_show', COUNT(*) FILTER (WHERE status = 'no_show')::INT,
    'booked_value', COALESCE(SUM(price) FILTER (WHERE status != 'cancelled'), 0)::NUMERIC,
    'completed_value', COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0)::NUMERIC
  ) INTO v_period
  FROM appointments
  WHERE tenant_id = p_tenant_id
    AND starts_at >= p_range_start
    AND starts_at < p_range_end
    AND (p_location_id IS NULL OR location_id = p_location_id)
    AND (p_resource_id IS NULL OR resource_id = p_resource_id);

  -- Comparison period (if provided)
  IF p_comp_start IS NOT NULL AND p_comp_end IS NOT NULL THEN
    SELECT jsonb_build_object(
      'total', COUNT(*)::INT,
      'completed', COUNT(*) FILTER (WHERE status = 'completed')::INT,
      'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')::INT,
      'no_show', COUNT(*) FILTER (WHERE status = 'no_show')::INT,
      'completed_value', COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0)::NUMERIC
    ) INTO v_comp
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_comp_start
      AND starts_at < p_comp_end
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id);
  ELSE
    v_comp := NULL;
  END IF;

  -- New vs returning customers (period)
  SELECT
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM appointments prior
      WHERE prior.tenant_id = p_tenant_id
        AND prior.customer_email = sub.customer_email
        AND prior.starts_at < p_range_start
        AND prior.status != 'cancelled'
      LIMIT 1
    ))::INT,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM appointments prior
      WHERE prior.tenant_id = p_tenant_id
        AND prior.customer_email = sub.customer_email
        AND prior.starts_at < p_range_start
        AND prior.status != 'cancelled'
      LIMIT 1
    ))::INT
  INTO v_new_customers, v_returning_customers
  FROM (
    SELECT DISTINCT lower(customer_email) AS customer_email
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND customer_email IS NOT NULL
      AND status != 'cancelled'
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
  ) sub;

  -- Daily trend
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', d::DATE,
      'total', COALESCE(cnt.total, 0),
      'completed', COALESCE(cnt.completed, 0),
      'cancelled', COALESCE(cnt.cancelled, 0),
      'no_show', COALESCE(cnt.no_show, 0)
    ) ORDER BY d
  ), '[]'::JSONB) INTO v_trend
  FROM generate_series(p_range_start::DATE, (p_range_end - INTERVAL '1 day')::DATE, '1 day') AS d
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::INT AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::INT AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::INT AS no_show
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= d
      AND starts_at < d + INTERVAL '1 day'
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
  ) cnt ON TRUE;

  -- Top services (top 10)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY appointment_count DESC), '[]'::JSONB) INTO v_services
  FROM (
    SELECT jsonb_build_object(
      'service_id', service_id,
      'service_name', service_name_snapshot,
      'appointment_count', COUNT(*)::INT,
      'completed_count', COUNT(*) FILTER (WHERE status = 'completed')::INT,
      'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled')::INT,
      'completed_value', COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0)::NUMERIC
    ) AS row_data,
    COUNT(*)::INT AS appointment_count
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
    GROUP BY service_id, service_name_snapshot
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub;

  -- Resource analytics (top 10)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY appointment_count DESC), '[]'::JSONB) INTO v_resources
  FROM (
    SELECT jsonb_build_object(
      'resource_id', resource_id,
      'resource_name', resource_name_snapshot,
      'appointment_count', COUNT(*)::INT,
      'completed_count', COUNT(*) FILTER (WHERE status = 'completed')::INT,
      'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled')::INT,
      'no_show_count', COUNT(*) FILTER (WHERE status = 'no_show')::INT,
      'scheduled_minutes', COALESCE(SUM(duration_minutes), 0)::INT
    ) AS row_data,
    COUNT(*)::INT AS appointment_count
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
    GROUP BY resource_id, resource_name_snapshot
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub;

  -- Location analytics
  SELECT COALESCE(jsonb_agg(row_data ORDER BY appointment_count DESC), '[]'::JSONB) INTO v_locations
  FROM (
    SELECT jsonb_build_object(
      'location_id', location_id,
      'location_name', location_name_snapshot,
      'appointment_count', COUNT(*)::INT,
      'completed_count', COUNT(*) FILTER (WHERE status = 'completed')::INT,
      'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled')::INT,
      'no_show_count', COUNT(*) FILTER (WHERE status = 'no_show')::INT,
      'completed_value', COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0)::NUMERIC
    ) AS row_data,
    COUNT(*)::INT AS appointment_count
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
    GROUP BY location_id, location_name_snapshot
    ORDER BY COUNT(*) DESC
  ) sub;

  -- Booking sources
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('source', source, 'count', cnt)
    ORDER BY cnt DESC
  ), '[]'::JSONB) INTO v_sources
  FROM (
    SELECT COALESCE(source, 'unknown') AS source, COUNT(*)::INT AS cnt
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
    GROUP BY source
  ) sub;

  -- Status breakdown
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('status', status, 'count', cnt)
    ORDER BY cnt DESC
  ), '[]'::JSONB) INTO v_statuses
  FROM (
    SELECT status, COUNT(*)::INT AS cnt
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_range_start
      AND starts_at < p_range_end
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND (p_resource_id IS NULL OR resource_id = p_resource_id)
    GROUP BY status
  ) sub;

  -- Assemble final result
  v_result := jsonb_build_object(
    'period', v_period,
    'comparison', v_comp,
    'new_customers', v_new_customers,
    'returning_customers', v_returning_customers,
    'trend', v_trend,
    'top_services', v_services,
    'resource_analytics', v_resources,
    'location_analytics', v_locations,
    'booking_sources', v_sources,
    'status_breakdown', v_statuses
  );

  RETURN v_result;
END;
$$;

-- Grant to authenticated users (RLS on appointments table still applies contextually,
-- but this SECURITY DEFINER function is called from trusted server context only)
GRANT EXECUTE ON FUNCTION get_dashboard_analytics_summary TO authenticated;

-- ─── Today Summary Count RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_today_appointment_counts(
  p_tenant_id UUID,
  p_today_start TIMESTAMPTZ,
  p_today_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*)::INT,
    'upcoming', COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed'))::INT,
    'checked_in', COUNT(*) FILTER (WHERE status = 'checked_in')::INT,
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')::INT,
    'completed', COUNT(*) FILTER (WHERE status = 'completed')::INT
  )
  FROM appointments
  WHERE tenant_id = p_tenant_id
    AND starts_at >= p_today_start
    AND starts_at < p_today_end
    AND status != 'cancelled';
$$;

GRANT EXECUTE ON FUNCTION get_today_appointment_counts TO authenticated;

-- ─── Customer Has-Upcoming Aggregate ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_customers_with_upcoming_flag(
  p_tenant_id UUID,
  p_customer_ids UUID[]
)
RETURNS TABLE(customer_id UUID, has_upcoming BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.id AS customer_id,
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = p_tenant_id
        AND a.customer_id = tc.id
        AND a.status NOT IN ('cancelled', 'completed', 'no_show')
        AND a.starts_at >= NOW()
      LIMIT 1
    ) AS has_upcoming
  FROM unnest(p_customer_ids) AS cid
  JOIN tenant_customers tc ON tc.id = cid AND tc.tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION get_customers_with_upcoming_flag TO authenticated;

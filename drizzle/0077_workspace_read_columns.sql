-- Expand workspace DEFINER reads with columns the dashboard pages need.
CREATE OR REPLACE FUNCTION sol_user_active_memberships_detail(p_user_id uuid)
RETURNS TABLE (
  membership_id uuid,
  membership_role text,
  membership_status text,
  membership_created_at timestamptz,
  membership_updated_at timestamptz,
  workspace_id uuid,
  workspace_slug text,
  workspace_name text,
  workspace_type text,
  workspace_status text,
  workspace_parent_id uuid,
  workspace_settings jsonb,
  workspace_created_at timestamptz,
  workspace_updated_at timestamptz,
  license_id uuid,
  license_plan text,
  license_seat_cap integer,
  license_status text,
  license_billing_provider text,
  license_stripe_subscription_id text,
  license_period_end timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    m.id,
    m.role::text,
    m.status::text,
    m.created_at,
    m.updated_at,
    w.id,
    w.slug,
    w.name,
    w.type::text,
    w.status::text,
    w.parent_workspace_id,
    w.settings,
    w.created_at,
    w.updated_at,
    lic.id,
    lic.plan::text,
    lic.seat_cap,
    lic.status::text,
    lic.billing_provider::text,
    lic.stripe_subscription_id,
    lic.period_end
  FROM workspace_memberships m
  JOIN workspaces w ON w.id = m.workspace_id
  LEFT JOIN LATERAL (
    SELECT
      l.id,
      l.plan,
      l.seat_cap,
      l.status,
      l.billing_provider,
      l.stripe_subscription_id,
      l.period_end
    FROM workspace_licenses l
    WHERE l.workspace_id = w.id
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT 1
  ) lic ON true
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
  ORDER BY m.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_usage_daily(p_workspace_id uuid, p_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  day text,
  grade_units integer,
  tutor_units integer,
  embed_units integer,
  updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT u.id, u.day, u.grade_units, u.tutor_units, u.embed_units, u.updated_at
  FROM workspace_usage_daily u
  WHERE u.workspace_id = p_workspace_id
  ORDER BY u.day DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION sol_workspace_audit_rows(p_workspace_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  action text,
  created_at timestamptz,
  actor_user_id uuid,
  actor_clerk_id text,
  target_type text,
  target_id text,
  metadata jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id,
    a.action,
    a.created_at,
    a.actor_user_id,
    a.actor_clerk_id,
    a.target_type,
    a.target_id,
    a.metadata
  FROM audit_log a
  WHERE a.tenant_id = p_workspace_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION sol_lti_platforms_for_workspace(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  issuer text,
  client_id text,
  auth_login_url text,
  auth_token_url text,
  key_set_url text,
  label text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    p.id,
    p.issuer,
    p.client_id,
    p.auth_login_url,
    p.auth_token_url,
    p.key_set_url,
    p.label,
    p.created_at
  FROM lti_platforms p
  WHERE p.tenant_id = p_workspace_id
  ORDER BY p.created_at DESC;
$$;

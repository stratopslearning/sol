-- Helper to clear accidental indefinite pilots (trialing + null period window
-- with no Stripe sub and no admin grant period_start). New Creator/Business
-- tenants are provisioned as license status=incomplete instead (see
-- provisionWorkspace). Call per workspace with tenant pin under FORCE RLS.

CREATE OR REPLACE FUNCTION sol_downgrade_auto_stripe_pilot(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_workspace_id IS NULL THEN
    RETURN false;
  END IF;
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);

  UPDATE workspace_licenses
  SET status = 'incomplete', updated_at = now()
  WHERE workspace_id = p_workspace_id
    AND billing_provider = 'stripe'
    AND status = 'trialing'
    AND stripe_subscription_id IS NULL
    AND period_start IS NULL
    AND period_end IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION sol_downgrade_auto_stripe_pilot(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_downgrade_auto_stripe_pilot(uuid) TO sol_app;
  END IF;
END
$$;

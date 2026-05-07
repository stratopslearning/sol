/**
 * Feature flags.
 *
 * Flags are read from `process.env` and are safe to use from both server and
 * client code because `NEXT_PUBLIC_*` vars are inlined at build time.
 *
 * Defaults are chosen so the platform behaves as if the flag is OFF when the
 * env var is unset — production toggles are then a single env change, not a
 * code change.
 */

/**
 * When false, the Stripe paywall is fully bypassed:
 *   - middleware does not redirect unpaid students to `/payment`
 *   - server helpers (`requirePayment`) skip the paid check
 *   - the student enrollment API does not gate on `paid`
 *   - the `/payment` page redirects to the student dashboard
 *   - Navbar / Hero / Sidebar treat every signed-in student as entitled
 *
 * The Stripe code paths (`/api/stripe/*`, webhook idempotency, schema columns,
 * admin bulk import) remain wired so flipping this back on does not require a
 * data migration.
 */
export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
}

/**
 * Is this user entitled to use student-paid features?
 *
 * - When payments are disabled (flag off), every authenticated student is
 *   entitled regardless of the `paid` column.
 * - When payments are enabled, behavior matches the `paid` column.
 */
export function isStudentEntitled(user: { paid?: boolean | null }): boolean {
  if (!paymentsEnabled()) return true;
  return Boolean(user.paid);
}

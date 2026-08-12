import { getDashboardUrl } from '@/lib/auth';
import { paymentsEnabled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';

/**
 * Post-auth landing: send the signed-in user to their role dashboard
 * (or payment, when the student paywall is on). Used as Clerk's
 * fallbackRedirectUrl after sign-in / sign-up.
 */
export default async function DashboardIndexPage() {
  const user = await getOrCreateUser();
  if (!user) {
    appRedirect('/login');
  }

  if (paymentsEnabled() && user.role === 'STUDENT' && !user.paid) {
    appRedirect('/payment');
  }

  appRedirect(getDashboardUrl(user.role));
}

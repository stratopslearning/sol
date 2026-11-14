import { resolveDashboardPath } from '@/lib/auth';
import { paymentsEnabled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';
import {
  getDashboardAreas,
  userCanAccessLearningArea,
  userCanAccessTeachingArea,
} from '@/lib/authz/gates';
import { listActiveMembershipsForUser } from '@/lib/workspace';

/**
 * Post-auth landing: binding-derived Teaching / Learning / Admin areas.
 */
export default async function DashboardIndexPage() {
  const user = await getOrCreateUser();
  if (!user) {
    appRedirect('/login');
  }

  const areas = await getDashboardAreas(user);

  if (
    paymentsEnabled() &&
    areas.learning &&
    !areas.teaching &&
    !user.paid
  ) {
    appRedirect('/payment');
  }

  if (areas.platformStaff) {
    appRedirect('/dashboard/admin');
  }

  if (areas.teaching) {
    const memberships = await listActiveMembershipsForUser(user.id);
    if (memberships.length === 0 && !(await userCanAccessTeachingArea(user.id))) {
      appRedirect('/onboarding');
    }
    if (memberships.length > 1 || (areas.teaching && areas.learning)) {
      appRedirect('/dashboard/home');
    }
    appRedirect('/dashboard/professor');
  }

  if (areas.learning || (await userCanAccessLearningArea(user.id))) {
    appRedirect('/dashboard/student');
  }

  appRedirect(await resolveDashboardPath(user));
}

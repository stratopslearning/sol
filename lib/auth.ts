import { paymentsEnabled } from './featureFlags';
import { appRedirect } from './serverRedirect';
import {
  getOrCreateUser,
  getUser,
  refreshUserEntitlements,
  UserData,
} from './getOrCreateUser';
import {
  getDashboardAreas,
  requireLearningAccess,
  requirePlatformStaff,
  requireTeachingAccess,
  userCanAccessLearningArea,
  userCanAccessTeachingArea,
} from '@/lib/authz/gates';

/**
 * Middleware helper to ensure user is authenticated and synced
 */
export async function requireAuth(): Promise<UserData> {
  const user = await getOrCreateUser();

  if (!user) {
    appRedirect('/login');
  }

  return user;
}

/**
 * @deprecated Prefer requireTeachingAccess / requireLearningAccess / requirePlatformStaff.
 * Kept for gradual migration of call sites.
 */
export type LegacyDashboardRole = 'STUDENT' | 'PROFESSOR' | 'ADMIN';

export async function requireRole(
  requiredRole: LegacyDashboardRole,
): Promise<UserData> {
  const user = await refreshUserEntitlements(await requireAuth());

  if (requiredRole === 'ADMIN') {
    return requirePlatformStaff();
  }
  if (requiredRole === 'PROFESSOR') {
    return requireTeachingAccess();
  }
  if (requiredRole === 'STUDENT') {
    return requireLearningAccess();
  }

  appRedirect(await resolveDashboardPath(user));
}

/**
 * Middleware helper to check if student has paid.
 */
export async function requirePayment(): Promise<UserData> {
  const user = await refreshUserEntitlements(await requireAuth());

  if (paymentsEnabled() && !user.paid) {
    const learning = await userCanAccessLearningArea(user.id);
    const teaching = await userCanAccessTeachingArea(user.id);
    if (learning && !teaching && !user.paid) {
      appRedirect('/payment');
    }
  }

  return user;
}

export async function requireProfessor(): Promise<UserData> {
  return requireTeachingAccess();
}

export async function requireAdmin(): Promise<UserData> {
  return requirePlatformStaff();
}

export async function requireStudent(): Promise<UserData> {
  await requireLearningAccess();
  return requirePayment();
}

export async function canAccessResource(
  resourceUserId: string,
  _allowedRoles: LegacyDashboardRole[] = ['ADMIN'],
): Promise<boolean> {
  const user = await getUser();

  if (!user) {
    return false;
  }

  // No platform_staff / ADMIN bypass for tenant or user resources.
  // Cross-tenant admin access must use requireSupportGrant(tenantId).

  if (user.id === resourceUserId) {
    return true;
  }

  return false;
}

/** @deprecated Prefer resolveDashboardPath(user) from bindings. */
export function getDashboardUrl(role: LegacyDashboardRole): string {
  switch (role) {
    case 'STUDENT':
      return '/dashboard/student';
    case 'PROFESSOR':
      return '/dashboard/professor';
    case 'ADMIN':
      return '/dashboard/admin';
    default:
      return '/';
  }
}

/** Dashboard path from bindings + enrollments (not global users.role). */
export async function resolveDashboardPath(
  user: Pick<UserData, 'id' | 'platformStaff'> & { platformStaff?: boolean },
): Promise<string> {
  const areas = await getDashboardAreas(user);
  if (areas.platformStaff) return '/dashboard/admin';
  if (areas.teaching && areas.learning) return '/dashboard/home';
  if (areas.teaching) return '/dashboard/professor';
  if (areas.learning) return '/dashboard/student';
  return '/onboarding';
}

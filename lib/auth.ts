import { redirect } from 'next/navigation';
import { getOrCreateUser, getUser, UserData } from './getOrCreateUser';

/**
 * Middleware helper to ensure user is authenticated and synced
 */
export async function requireAuth(): Promise<UserData> {
  const user = await getOrCreateUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

/**
 * Middleware helper to check if user has required role
 */
export async function requireRole(requiredRole: UserData['role']): Promise<UserData> {
  const user = await requireAuth();
  
  if (user.role !== requiredRole && user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Middleware helper to check if student has paid
 */
export async function requirePayment(): Promise<UserData> {
  const user = await requireAuth();
  
  if (user.role === 'STUDENT' && !user.paid) {
    redirect('/payment');
  }
  
  return user;
}

/**
 * Middleware helper for professor access
 */
export async function requireProfessor(): Promise<UserData> {
  return requireRole('PROFESSOR');
}

/**
 * Middleware helper for admin access
 */
export async function requireAdmin(): Promise<UserData> {
  return requireRole('ADMIN');
}

/**
 * Middleware helper for student access (with payment check)
 */
export async function requireStudent(): Promise<UserData> {
  const user = await requireRole('STUDENT');
  return requirePayment();
}

/**
 * Check if user can access a specific resource
 */
export async function canAccessResource(
  resourceUserId: string,
  allowedRoles: UserData['role'][] = ['ADMIN']
): Promise<boolean> {
  const user = await getUser();
  
  if (!user) {
    return false;
  }
  
  // Admin can access everything
  if (user.role === 'ADMIN') {
    return true;
  }
  
  // User can access their own resources
  if (user.id === resourceUserId) {
    return true;
  }
  
  // Check if user has required role
  return allowedRoles.includes(user.role);
}

/**
 * Get user's dashboard URL based on their role
 */
export function getDashboardUrl(role: UserData['role']): string {
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
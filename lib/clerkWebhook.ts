/**
 * Pure helpers for Clerk webhook → audit_log mapping (unit-testable).
 */

export type ClerkSessionAuditAction =
  | 'auth.session.create'
  | 'auth.session.end';

export function mapClerkSessionEvent(
  type: string,
): ClerkSessionAuditAction | null {
  switch (type) {
    case 'session.created':
      return 'auth.session.create';
    case 'session.ended':
    case 'session.revoked':
    case 'session.removed':
    case 'user.signed_out':
      return 'auth.session.end';
    default:
      return null;
  }
}

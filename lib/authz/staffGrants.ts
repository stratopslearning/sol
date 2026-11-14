import type { AuthzScopeType } from '@/lib/authz/authorize';
import {
  listActiveBindingsForScope,
  revokeRoleBinding,
  upsertRoleBinding,
} from '@/lib/authz/bindings';
import type { BindingRole } from '@/lib/authz/permissions';
import { ensureWorkspaceMembership } from '@/lib/workspace/access';

export type StaffGrantRole = Extract<
  BindingRole,
  'lead_instructor' | 'co_instructor' | 'ta' | 'grader'
>;

const STAFF_ROLES: StaffGrantRole[] = [
  'lead_instructor',
  'co_instructor',
  'ta',
  'grader',
];

export function isStaffGrantRole(role: string): role is StaffGrantRole {
  return STAFF_ROLES.includes(role as StaffGrantRole);
}

/** Lead / co-instructor on an offering. */
export async function grantOfferingStaff(opts: {
  tenantId: string;
  userId: string;
  offeringId: string;
  role: Extract<StaffGrantRole, 'lead_instructor' | 'co_instructor'>;
  grantedBy?: string | null;
}): Promise<{ grantId: string; created: boolean }> {
  const result = await upsertRoleBinding({
    tenantId: opts.tenantId,
    userId: opts.userId,
    scopeType: 'offering',
    scopeId: opts.offeringId,
    role: opts.role,
    grantedBy: opts.grantedBy,
  });
  // Seat only — no power via membership role.
  await ensureWorkspaceMembership({
    workspaceId: opts.tenantId,
    userId: opts.userId,
    role: 'learner',
  });
  return { grantId: result.bindingId, created: result.created };
}

export async function grantSectionStaff(opts: {
  tenantId: string;
  userId: string;
  sectionId: string;
  role: Extract<StaffGrantRole, 'ta' | 'grader'>;
  grantedBy?: string | null;
  /** When true, ensure a seat without elevating membership power. */
  ensureSeat?: boolean;
}): Promise<{ grantId: string; created: boolean }> {
  const result = await upsertRoleBinding({
    tenantId: opts.tenantId,
    userId: opts.userId,
    scopeType: 'section',
    scopeId: opts.sectionId,
    role: opts.role,
    grantedBy: opts.grantedBy,
  });
  if (opts.ensureSeat !== false) {
    await ensureWorkspaceMembership({
      workspaceId: opts.tenantId,
      userId: opts.userId,
      role: 'learner',
    });
  }
  return { grantId: result.bindingId, created: result.created };
}

export async function revokeStaffGrant(grantId: string): Promise<void> {
  await revokeRoleBinding(grantId);
}

export async function listActiveStaffGrantsForScope(opts: {
  tenantId: string;
  scopeType: AuthzScopeType;
  scopeId: string;
}) {
  return listActiveBindingsForScope(opts);
}

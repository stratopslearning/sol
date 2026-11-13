/**
 * Offering creation. Every course has a default offering (term_label='default');
 * the creating instructor is bound as lead_instructor on it (item 19).
 */
import { upsertRoleBinding } from '@/lib/authz/bindings';
import { ensureOfferingDefiner } from '@/lib/db/facultyWriteDefiners';
import type { TenantDb } from '@/lib/db/tenantFromCourse';

export type OfferingRow = {
  id: string;
  courseId: string;
  tenantId: string | null;
  termLabel: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

/**
 * Idempotently ensure an offering exists for (course, term).
 * FORCE RLS: always uses SECURITY DEFINER (Neon withTenant GUCs flake).
 * `client` is accepted for call-site compatibility but unused for writes.
 */
export async function ensureOffering(
  _client: TenantDb | unknown,
  opts: {
    courseId: string;
    tenantId: string;
    termLabel?: string;
    status?: OfferingRow['status'];
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
): Promise<OfferingRow> {
  return ensureOfferingDefiner({
    courseId: opts.courseId,
    tenantId: opts.tenantId,
    termLabel: opts.termLabel?.trim() || 'default',
    status: opts.status ?? 'active',
    startsAt: opts.startsAt?.toISOString() ?? null,
    endsAt: opts.endsAt?.toISOString() ?? null,
  });
}

/** Bind the creating instructor as lead_instructor on the offering. */
export async function bindLeadInstructor(opts: {
  tenantId: string;
  offeringId: string;
  userId: string;
  grantedBy?: string | null;
}): Promise<void> {
  await upsertRoleBinding({
    tenantId: opts.tenantId,
    userId: opts.userId,
    scopeType: 'offering',
    scopeId: opts.offeringId,
    role: 'lead_instructor',
    grantedBy: opts.grantedBy ?? opts.userId,
  });
}

/** Create (or reuse) an offering and make `leadUserId` its lead instructor. */
export async function createOfferingWithLead(opts: {
  courseId: string;
  tenantId: string;
  termLabel?: string;
  leadUserId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}): Promise<OfferingRow> {
  const offering = await ensureOffering(null, opts);
  if (opts.leadUserId) {
    await bindLeadInstructor({
      tenantId: opts.tenantId,
      offeringId: offering.id,
      userId: opts.leadUserId,
    });
  }
  return offering;
}

import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { auditLog } from '@/app/db/schema';
import { AdminSection } from '@/components/admin/AdminSection';
import { DisclosureRecordForm } from '@/components/admin/DisclosureRecordForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireAdmin } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  action?: string;
  from?: string;
  to?: string;
  page?: string;
  tenantId?: string;
}>;

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || '1') || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (sp.action?.trim()) {
    conditions.push(eq(auditLog.action, sp.action.trim()));
  }
  if (sp.from) {
    const d = new Date(sp.from);
    if (!Number.isNaN(d.getTime())) conditions.push(gte(auditLog.createdAt, d));
  }
  if (sp.to) {
    const d = new Date(sp.to);
    if (!Number.isNaN(d.getTime())) conditions.push(lte(auditLog.createdAt, d));
  }
  if (sp.tenantId?.trim() && /^[0-9a-f-]{36}$/i.test(sp.tenantId.trim())) {
    conditions.push(eq(auditLog.tenantId, sp.tenantId.trim()));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRow] = await Promise.all([
    db.query.auditLog.findMany({
      where,
      orderBy: [desc(auditLog.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where),
  ]);

  const total = countRow[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterQs = new URLSearchParams();
  if (sp.action) filterQs.set('action', sp.action);
  if (sp.from) filterQs.set('from', sp.from);
  if (sp.to) filterQs.set('to', sp.to);
  if (sp.tenantId) filterQs.set('tenantId', sp.tenantId);

  return (
    <AppShell
      role="admin"
      active="audit"
      topbarTitle="Audit log"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', href: withBasePath('/dashboard/admin') },
          { label: 'Audit log' },
        ]}
        eyebrow="Accountability"
        title="Audit trail"
        description="Privileged mutations and FERPA-sensitive disclosures. Append-only — not editable from the app."
      />

      <AdminSection first eyebrow="Disclosure" title="Record a disclosure">
        <DisclosureRecordForm />
      </AdminSection>

      <AdminSection
        eyebrow="Log"
        title="Recent entries"
        description={`${total} matching row${total === 1 ? '' : 's'}.`}
      >
        <form
          method="get"
          className="rounded-lg border border-rule/70 bg-surface p-4 grid gap-3 sm:grid-cols-5 items-end"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="audit-tenant">Tenant (workspace id)</Label>
            <Input
              id="audit-tenant"
              name="tenantId"
              defaultValue={sp.tenantId ?? ''}
              placeholder="uuid"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Input
              id="audit-action"
              name="action"
              defaultValue={sp.action ?? ''}
              placeholder="e.g. education.gradebook.view"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audit-from">From</Label>
            <Input
              id="audit-from"
              name="from"
              type="date"
              defaultValue={sp.from?.slice(0, 10) ?? ''}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="audit-to">To</Label>
            <Input
              id="audit-to"
              name="to"
              type="date"
              defaultValue={sp.to?.slice(0, 10) ?? ''}
            />
          </div>
          <Button type="submit">Filter</Button>
        </form>

        <div className="overflow-x-auto paper paper-shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    No audit entries match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {row.createdAt
                        ? new Date(row.createdAt).toISOString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.targetType ?? '-'}
                      {row.targetId ? ` / ${row.targetId.slice(0, 8)}…` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.actorUserId
                        ? `${row.actorUserId.slice(0, 8)}…`
                        : row.actorClerkId ?? '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">
                      {row.metadata
                        ? JSON.stringify(row.metadata).slice(0, 120)
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 text-sm">
          {page > 1 ? (
            <a
              className="text-brand underline underline-offset-4"
              href={withBasePath(
                `/dashboard/admin/audit?${new URLSearchParams({
                  ...Object.fromEntries(filterQs.entries()),
                  page: String(page - 1),
                }).toString()}`,
              )}
            >
              Previous
            </a>
          ) : null}
          <span className="text-ink-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <a
              className="text-brand underline underline-offset-4"
              href={withBasePath(
                `/dashboard/admin/audit?${new URLSearchParams({
                  ...Object.fromEntries(filterQs.entries()),
                  page: String(page + 1),
                }).toString()}`,
              )}
            >
              Next
            </a>
          ) : null}
        </div>
      </AdminSection>
    </AppShell>
  );
}

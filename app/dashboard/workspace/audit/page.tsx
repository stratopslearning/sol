import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { withBasePath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { appRedirect } from '@/lib/serverRedirect';
import {
  getActiveWorkspaceId,
  listActiveMembershipsForUser,
  userCanManageWorkspaceBilling,
} from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  action?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const PAGE_SIZE = 50;

export default async function WorkspaceAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireTeachingAccess();

  const memberships = await listActiveMembershipsForUser(user.id);
  const activeId = await getActiveWorkspaceId(user.id);
  const membership =
    memberships.find((m) => m.workspaceId === activeId) ?? memberships[0];
  if (!membership?.workspace) {
    appRedirect('/dashboard/workspace');
  }

  const tenantId = membership.workspace.id;
  const canView = await userCanManageWorkspaceBilling(user.id, tenantId);
  if (!canView && !user.platformStaff) {
    appRedirect('/dashboard/workspace');
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || '1') || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { fetchWorkspaceAuditRows } = await import(
    '@/lib/db/facultyStudentReads'
  );
  let filtered = await fetchWorkspaceAuditRows(tenantId, 500);
  if (sp.action?.trim()) {
    filtered = filtered.filter((r) => r.action === sp.action!.trim());
  }
  if (sp.from) {
    const d = new Date(sp.from);
    if (!Number.isNaN(d.getTime())) {
      filtered = filtered.filter((r) => r.createdAt.getTime() >= d.getTime());
    }
  }
  if (sp.to) {
    const d = new Date(sp.to);
    if (!Number.isNaN(d.getTime())) {
      filtered = filtered.filter((r) => r.createdAt.getTime() <= d.getTime());
    }
  }
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = filtered.slice(offset, offset + PAGE_SIZE);

  const filterQs = new URLSearchParams();
  if (sp.action) filterQs.set('action', sp.action);
  if (sp.from) filterQs.set('from', sp.from);
  if (sp.to) filterQs.set('to', sp.to);

  return (
    <AppShell role="professor" active="workspace" topbarTitle="Audit">
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: withBasePath('/dashboard/workspace') },
          { label: 'Audit log' },
        ]}
        eyebrow="Owner"
        title="Workspace audit trail"
        description={`Append-only log for ${membership.workspace.name}. Owner and workspace admins only.`}
      />

      <form
        method="get"
        className="mt-8 grid gap-3 rounded-xl border border-rule/80 bg-surface p-4 sm:grid-cols-4 items-end"
      >
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-rule paper-shadow">
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

      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 ? (
          <a
            className="text-brand underline underline-offset-4"
            href={withBasePath(
              `/dashboard/workspace/audit?${new URLSearchParams({
                ...Object.fromEntries(filterQs.entries()),
                page: String(page - 1),
              }).toString()}`,
            )}
          >
            Previous
          </a>
        ) : null}
        <span className="text-ink-muted">
          Page {page} of {totalPages} ({total} rows)
        </span>
        {page < totalPages ? (
          <a
            className="text-brand underline underline-offset-4"
            href={withBasePath(
              `/dashboard/workspace/audit?${new URLSearchParams({
                ...Object.fromEntries(filterQs.entries()),
                page: String(page + 1),
              }).toString()}`,
            )}
          >
            Next
          </a>
        ) : null}
      </div>
    </AppShell>
  );
}

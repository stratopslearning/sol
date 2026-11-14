import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { LocalDateTime } from '@/components/timezone/LocalDateTime';
import { withBasePath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { fetchWorkspaceUsageDaily } from '@/lib/db/facultyStudentReads';
import { appRedirect } from '@/lib/serverRedirect';
import {
  getActiveWorkspaceId,
  listActiveMembershipsForUser,
  userCanManageWorkspaceBilling,
} from '@/lib/workspace';
import { assertAiBandAvailable } from '@/lib/workspace/usage';

export const dynamic = 'force-dynamic';

export default async function WorkspaceUsagePage() {
  const user = await requireTeachingAccess();

  const memberships = await listActiveMembershipsForUser(user.id);
  const workspaceId = await getActiveWorkspaceId(user.id);
  const membership =
    memberships.find((m) => m.workspaceId === workspaceId) ?? memberships[0];
  if (!membership?.workspace) {
    appRedirect('/dashboard/workspace');
  }

  const canView = await userCanManageWorkspaceBilling(
    user.id,
    membership.workspace.id,
  );
  if (!canView && !user.platformStaff) {
    appRedirect('/dashboard/workspace');
  }

  const rows = await fetchWorkspaceUsageDaily(membership.workspace.id, 30);

  const aiCap = await assertAiBandAvailable(membership.workspace.id);
  const isCapped = !aiCap.ok;

  return (
    <AppShell role="professor" active="workspace" topbarTitle="Usage">
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: withBasePath('/dashboard/workspace') },
          { label: 'Usage' },
        ]}
        eyebrow="Owner"
        title="AI usage (daily)"
        description={`Rollup from workspace_usage_daily for ${membership.workspace.name}.`}
      />

      {isCapped ? (
        <div
          className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">AI usage cap reached</p>
          <p className="mt-1 text-amber-900/90">
            This workspace has used {aiCap.used} of {aiCap.cap} included AI
            units for the current license period. New grading and tutor jobs are
            queued until usage resets or the cap is raised — learners can still
            submit work.
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No usage recorded yet"
          description="Grading, tutor, and embed units will appear here as they accrue."
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-rule">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-rule bg-surface-sunken/50 text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Day (UTC)</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Tutor</th>
                <th className="px-4 py-3 font-medium">Embed</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{row.day}</td>
                  <td className="px-4 py-2.5">{row.gradeUnits}</td>
                  <td className="px-4 py-2.5">{row.tutorUnits}</td>
                  <td className="px-4 py-2.5">{row.embedUnits}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    <LocalDateTime value={row.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

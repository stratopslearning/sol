import { TenantsInstitutionClient } from '@/app/dashboard/admin/tenants/TenantsInstitutionClient';
import { AdminSection } from '@/components/admin/AdminSection';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { fetchAdminWorkspaceDirectory } from '@/lib/admin/platformReads';
import { requireAdmin } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
  const admin = await requireAdmin();

  const rows = await fetchAdminWorkspaceDirectory();

  return (
    <AppShell
      role="admin"
      active="admin"
      topbarTitle="Tenants"
      user={{
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      }}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', href: withBasePath('/dashboard/admin') },
          { label: 'Tenants' },
        ]}
        eyebrow="Internal"
        title="Workspace directory"
        description="License and course counts per tenant. Link department workspaces under an institution parent."
      />

      <AdminSection
        first
        eyebrow="Institution"
        title="Org hierarchy"
        description="Pick a child workspace and POST link-parent to attach or detach an institution parent."
      >
        <TenantsInstitutionClient
          workspaces={rows.map((w) => ({
            id: w.id,
            name: w.name,
            slug: w.slug,
            type: w.type,
            parentWorkspaceId: w.parentWorkspaceId,
          }))}
        />
      </AdminSection>

      <div className="mt-10 overflow-x-auto rounded-xl border border-rule">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-rule bg-surface-sunken/50 text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Courses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              return (
                <tr key={w.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-ink">{w.name}</span>
                    <span className="mt-0.5 block font-mono text-xs text-ink-muted">
                      {w.slug}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{w.type}</td>
                  <td className="px-4 py-2.5">{w.licensePlan ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{w.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {w.courseCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

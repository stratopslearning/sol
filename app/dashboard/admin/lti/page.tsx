import { AdminSection } from '@/components/admin/AdminSection';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAdmin } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { getLtiConfig } from '@/lib/lti/config';
import { listSectionLinksWithMeta } from '@/lib/lti/links';
import {
  ensurePlatformFromEnv,
  resolveLtiWorkspaceId,
} from '@/lib/lti/platform';
import { LocalDateTime } from '@/components/timezone/LocalDateTime';

export default async function AdminLtiPage() {
  await requireAdmin();
  const cfg = getLtiConfig();

  let platformLabel: string | null = null;
  let deploymentId: string | null = null;
  if (cfg.enabled) {
    try {
      const ltiWorkspaceId = await resolveLtiWorkspaceId();
      const ensured = await ensurePlatformFromEnv(ltiWorkspaceId);
      platformLabel = ensured.platform.label ?? ensured.platform.issuer;
      deploymentId = ensured.deployment.deploymentId;
    } catch {
      platformLabel = null;
    }
  }

  const links = await listSectionLinksWithMeta();

  return (
    <AppShell role="admin" active="lti" topbarTitle="Canvas LTI">
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', href: withBasePath('/dashboard/admin') },
          { label: 'Canvas LTI' },
        ]}
        eyebrow="Integrations"
        title="Canvas LTI"
        description="Deployment status and section links. Enrollment codes still work alongside Canvas. Platforms are workspace-scoped."
      />

      <AdminSection
        first
        eyebrow="Platform"
        title="Developer key endpoints"
        description={
          cfg.enabled
            ? 'LTI is enabled for this install.'
            : 'Set LTI_ENABLED=true and related env vars to activate.'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge
            kind="generic"
            value={cfg.enabled ? 'active' : 'inactive'}
            label={cfg.enabled ? 'Enabled' : 'Disabled'}
          />
          {platformLabel ? (
            <span className="text-sm text-ink-muted">{platformLabel}</span>
          ) : null}
          {deploymentId ? (
            <Badge variant="outline">deployment {deploymentId}</Badge>
          ) : null}
        </div>
        {cfg.enabled ? (
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-ink-faint">OIDC login</dt>
              <dd className="font-mono text-xs break-all text-ink">{cfg.loginUrl}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Redirect / launch</dt>
              <dd className="font-mono text-xs break-all text-ink">{cfg.launchUrl}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">JWKS</dt>
              <dd className="font-mono text-xs break-all text-ink">{cfg.jwksUrl}</dd>
            </div>
          </dl>
        ) : null}
      </AdminSection>

      <AdminSection
        eyebrow="Links"
        title="Section ↔ Canvas course"
        description="Faculty create these from the section page."
      >
        {links.length === 0 ? (
          <EmptyState
            title="No Canvas links yet"
            description="When faculty link a section, it will show up here."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-rule/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Canvas course</TableHead>
                  <TableHead>AGS</TableHead>
                  <TableHead>NRPS</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.courseTitle ?? '—'}</TableCell>
                    <TableCell>{link.sectionName ?? link.sectionId}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {link.canvasCourseId}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        kind="claim"
                        value={link.hasAgs ? 'claimed' : 'pending'}
                        label={link.hasAgs ? 'Ready' : 'Pending'}
                      />
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        kind="claim"
                        value={link.hasNrps ? 'claimed' : 'pending'}
                        label={link.hasNrps ? 'Ready' : 'Pending'}
                      />
                    </TableCell>
                    <TableCell>
                      <LocalDateTime value={link.updatedAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSection>
    </AppShell>
  );
}

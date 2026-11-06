import { LtiRegisterForm } from '@/app/dashboard/workspace/lti/LtiRegisterForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { getLtiConfig } from '@/lib/lti/config';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { fetchLtiPlatformsForWorkspace } from '@/lib/db/facultyStudentReads';
import { appRedirect } from '@/lib/serverRedirect';
import {
  getActiveWorkspaceId,
  listActiveMembershipsForUser,
  userCanManageWorkspaceBilling,
} from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLtiPage() {
  const user = await requireTeachingAccess();

  const memberships = await listActiveMembershipsForUser(user.id);
  const activeId = await getActiveWorkspaceId(user.id);
  const membership =
    memberships.find((m) => m.workspaceId === activeId) ?? memberships[0];
  if (!membership?.workspace) {
    appRedirect('/dashboard/workspace');
  }

  const canManage = await userCanManageWorkspaceBilling(
    user.id,
    membership.workspace.id,
  );
  if (!canManage && !user.platformStaff) {
    appRedirect('/dashboard/workspace');
  }

  const platforms = await fetchLtiPlatformsForWorkspace(
    membership.workspace.id,
  );
  const platform = platforms[0] ?? null;

  const cfg = getLtiConfig();

  return (
    <AppShell role="professor" active="workspace" topbarTitle="LTI">
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: withBasePath('/dashboard/workspace') },
          { label: 'LTI registration' },
        ]}
        eyebrow="Integrations"
        title="LTI 1.3 platform"
        description="Register your LMS platform for this workspace. Saving stores issuer, client, and OIDC endpoints — the signed OIDC dynamic registration handshake is follow-up work."
      />

      {cfg.enabled ? (
        <dl className="mt-6 grid gap-3 rounded-2xl border border-rule/80 bg-surface-sunken/30 p-5 text-sm">
          <div>
            <dt className="text-ink-faint">Tool OIDC login</dt>
            <dd className="font-mono text-xs break-all text-ink">{cfg.loginUrl}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Tool launch URL</dt>
            <dd className="font-mono text-xs break-all text-ink">{cfg.launchUrl}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Tool JWKS</dt>
            <dd className="font-mono text-xs break-all text-ink">{cfg.jwksUrl}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          LTI is disabled on this install (`LTI_ENABLED` is not true). You can
          still save platform metadata for when ops enables the tool endpoints.
        </p>
      )}

      <div className="mt-8 max-w-xl">
        <LtiRegisterForm
          workspaceId={membership.workspace.id}
          initial={
            platform
              ? {
                  issuer: platform.issuer,
                  clientId: platform.clientId,
                  authLoginUrl: platform.authLoginUrl,
                  authTokenUrl: platform.authTokenUrl,
                  keySetUrl: platform.keySetUrl,
                  label: platform.label,
                }
              : undefined
          }
        />
      </div>
    </AppShell>
  );
}

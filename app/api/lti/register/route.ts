import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { ltiPlatforms, workspaces } from '@/app/db/schema';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { logAudit } from '@/lib/audit';
import { adminHasTenantDataAccess } from '@/lib/authz/supportAccess';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  DynamicRegistrationError,
  fetchOpenIdConfig,
  registerToolWithPlatform,
} from '@/lib/lti/dynamicRegistration';
import { absoluteUrl } from '@/lib/siteUrl';
import { userCanManageWorkspaceBilling } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * LTI 1.3 registration. Two modes (workspace coordinator only):
 *  - Dynamic (IMS): `{ workspaceId, openid_configuration, registration_token? }` —
 *    we fetch the platform OpenID config, register this tool at its
 *    `registration_endpoint`, receive `client_id`, and upsert `lti_platforms`.
 *  - Manual: explicit platform descriptor (issuer/clientId/URLs).
 */
const dynamicSchema = z.object({
  workspaceId: z.string().uuid(),
  openid_configuration: z.string().url(),
  registration_token: z.string().min(1).optional(),
  label: z.string().max(200).optional(),
});

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  issuer: z.string().url(),
  clientId: z.string().min(1),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  keySetUrl: z.string().url(),
  label: z.string().max(200).optional(),
});

async function requireWorkspaceCoordinator(workspaceId: string) {
  const user = await getOrCreateUser();
  if (!user) return null;
  if (user.platformStaff) {
    const ok = await adminHasTenantDataAccess(user, workspaceId);
    if (ok) return user;
  }
  const canManage = await userCanManageWorkspaceBilling(user.id, workspaceId);
  if (!canManage) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const raw = await readJsonBody(req);
  const dynamic = dynamicSchema.safeParse(raw);
  if (dynamic.success) {
    return handleDynamicRegistration(dynamic.data);
  }
  const body = bodySchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: 'Invalid registration payload', details: body.error.errors },
      { status: 400 },
    );
  }

  const actor = await requireWorkspaceCoordinator(body.data.workspaceId);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, body.data.workspaceId),
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const values = {
      workspaceId: body.data.workspaceId,
      tenantId: body.data.workspaceId,
      issuer: body.data.issuer,
      clientId: body.data.clientId,
      authLoginUrl: body.data.authLoginUrl,
      authTokenUrl: body.data.authTokenUrl,
      keySetUrl: body.data.keySetUrl,
      label: body.data.label ?? 'Registered platform',
      updatedAt: new Date(),
    };

    const [platform] = await db
      .insert(ltiPlatforms)
      .values(values)
      .onConflictDoUpdate({
        target: [
          ltiPlatforms.workspaceId,
          ltiPlatforms.issuer,
          ltiPlatforms.clientId,
        ],
        set: {
          authLoginUrl: values.authLoginUrl,
          authTokenUrl: values.authTokenUrl,
          keySetUrl: values.keySetUrl,
          label: values.label,
          tenantId: values.tenantId,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    await logAudit({
      actorUserId: actor.id,
      actorClerkId: actor.clerkId,
      action: 'lti.platform.register',
      targetType: 'lti_platform',
      targetId: platform.id,
      tenantId: body.data.workspaceId,
      metadata: {
        issuer: body.data.issuer,
        clientId: body.data.clientId,
      },
    });

    return NextResponse.json(
      {
        platform,
        mode: 'manual',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[lti/register]', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

async function handleDynamicRegistration(input: z.infer<typeof dynamicSchema>) {
  const actor = await requireWorkspaceCoordinator(input.workspaceId);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, input.workspaceId),
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const config = await fetchOpenIdConfig(input.openid_configuration);
    const { clientId } = await registerToolWithPlatform({
      config,
      registrationToken: input.registration_token,
      clientName: 'SOL',
      urls: {
        baseUrl: absoluteUrl('/'),
        loginUrl: absoluteUrl('/api/lti/login'),
        launchUrl: absoluteUrl('/api/lti/launch'),
        jwksUrl: absoluteUrl('/api/lti/jwks'),
      },
    });

    const values = {
      workspaceId: input.workspaceId,
      tenantId: input.workspaceId,
      issuer: config.issuer,
      clientId,
      authLoginUrl: config.authorization_endpoint,
      authTokenUrl: config.token_endpoint,
      keySetUrl: config.jwks_uri,
      label: input.label ?? new URL(config.issuer).host,
      updatedAt: new Date(),
    };
    const [platform] = await db
      .insert(ltiPlatforms)
      .values(values)
      .onConflictDoUpdate({
        target: [
          ltiPlatforms.workspaceId,
          ltiPlatforms.issuer,
          ltiPlatforms.clientId,
        ],
        set: {
          authLoginUrl: values.authLoginUrl,
          authTokenUrl: values.authTokenUrl,
          keySetUrl: values.keySetUrl,
          label: values.label,
          tenantId: values.tenantId,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    await logAudit({
      actorUserId: actor.id,
      actorClerkId: actor.clerkId,
      action: 'lti.platform.register',
      targetType: 'lti_platform',
      targetId: platform.id,
      tenantId: input.workspaceId,
      metadata: { issuer: config.issuer, clientId, mode: 'dynamic' },
    });

    return NextResponse.json({ platform, mode: 'dynamic' }, { status: 200 });
  } catch (error) {
    if (error instanceof DynamicRegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && /URL/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[lti/register:dynamic]', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

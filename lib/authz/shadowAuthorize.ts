/**
 * Shadow authorization: evaluate the LEGACY decision (users.role / professorId)
 * and the NEW authorize() decision side by side, log structured mismatches, and
 * return the LEGACY result. No behavior change — this is the evidence stream
 * used to decide when each module can be cut over (Wave 2 / item 11).
 *
 * Disable with SHADOW_AUTHZ=0. Mismatch logs are single-line JSON with
 * `event: "authz.shadow_mismatch"` so they can be drained from the log pipeline.
 *
 * NOTE: this file intentionally contains legacy role comparisons and is on the
 * eslint-legacy-authz allowlist.
 */
import { authorize, type AuthzResource } from '@/lib/authz/authorize';
import type { LegacyAuthzAction, Permission } from '@/lib/authz/permissions';
import type { UserData } from '@/lib/getOrCreateUser';

type ShadowUser = Pick<UserData, 'id' | 'platformStaff'> & {
  /** Legacy users.role; shadow legacy path only (column dropped after contract). */
  role?: string | null;
};

export type ShadowEvent = {
  event: 'authz.shadow_mismatch' | 'authz.shadow_error';
  site: string;
  userId: string;
  permission: string;
  resource: AuthzResource | null;
  legacy: boolean;
  next: boolean | null;
  error?: string;
};

type Sink = (event: ShadowEvent) => void;

const defaultSink: Sink = (event) => {
  console.warn(JSON.stringify({ ...event, ts: new Date().toISOString() }));
};

let sink: Sink = defaultSink;

/** Test hook. Pass null to restore the default console sink. */
export function setShadowSink(next: Sink | null): void {
  sink = next ?? defaultSink;
}

export function shadowAuthzEnabled(): boolean {
  return process.env.SHADOW_AUTHZ !== '0';
}

/** The pre-cutover "may use teaching UI" decision (global role based). */
export function legacyHasTeachingRole(user: ShadowUser): boolean {
  if (user.platformStaff) return true;
  const { role: legacyUsersRoleColumn } = user;
  return (
    legacyUsersRoleColumn === 'PROFESSOR' ||
    legacyUsersRoleColumn === 'ADMIN'
  );
}

/**
 * Compare a legacy decision with authorize(). Returns the legacy result.
 */
export async function shadowAuthorize(opts: {
  site: string;
  user: ShadowUser;
  permission: Permission | LegacyAuthzAction;
  resource: AuthzResource;
  legacy: boolean | (() => boolean | Promise<boolean>);
}): Promise<boolean> {
  const legacy =
    typeof opts.legacy === 'function' ? await opts.legacy() : opts.legacy;
  if (!shadowAuthzEnabled()) return legacy;

  try {
    const next = await authorize(opts.user, opts.permission, opts.resource);
    if (next !== legacy) {
      sink({
        event: 'authz.shadow_mismatch',
        site: opts.site,
        userId: opts.user.id,
        permission: opts.permission,
        resource: opts.resource,
        legacy,
        next,
      });
    }
  } catch (err) {
    sink({
      event: 'authz.shadow_error',
      site: opts.site,
      userId: opts.user.id,
      permission: opts.permission,
      resource: opts.resource,
      legacy,
      next: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return legacy;
}

/**
 * Compare two arbitrary booleans (for gates that compute the new answer without
 * a single authorize() call, e.g. "any teaching binding").
 */
export async function shadowCompare(opts: {
  site: string;
  userId: string;
  label: string;
  legacy: boolean;
  next: () => boolean | Promise<boolean>;
}): Promise<boolean> {
  if (!shadowAuthzEnabled()) return opts.legacy;
  try {
    const next = await opts.next();
    if (next !== opts.legacy) {
      sink({
        event: 'authz.shadow_mismatch',
        site: opts.site,
        userId: opts.userId,
        permission: opts.label,
        resource: null,
        legacy: opts.legacy,
        next,
      });
    }
  } catch (err) {
    sink({
      event: 'authz.shadow_error',
      site: opts.site,
      userId: opts.userId,
      permission: opts.label,
      resource: null,
      legacy: opts.legacy,
      next: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return opts.legacy;
}

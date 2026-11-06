export {
  DEFAULT_WORKSPACE_ID,
  ensureDefaultWorkspace,
  getWorkspace,
  getActiveLicense,
  countActiveLearners,
  assertSeatAvailable,
  getCourseWorkspaceId,
  userCanAccessWorkspace,
  assertCourseInWorkspace,
  ensureWorkspaceMembership,
  type WorkspaceRow,
  type WorkspaceLicenseRow,
  type SeatCheckResult,
} from '@/lib/workspace/access';

export {
  recordAiUsage,
  assertAiBandAvailable,
  aiBandWarning,
  sumUsageInPeriod,
  type AiUsageKind,
} from '@/lib/workspace/usage';

export { checkAiBandAvailable, type AiCapBlock } from '@/lib/workspace/aiCapGuard';

export {
  ACTIVE_WORKSPACE_COOKIE,
  getActiveWorkspaceId,
  resolveFacultyWorkspaceId,
} from '@/lib/workspace/activeWorkspace';

export {
  resolveProfessorEnrollWorkspaceId,
  resolveStudentEnrollWorkspaceId,
} from '@/lib/workspace/enrollmentWorkspace';

export {
  listCoursesForWorkspace,
  resolveWorkspaceScopeParam,
} from '@/lib/workspace/queries';

export {
  WORKSPACE_PRICING_CATALOG,
  AI_UNIT_COGS_USD,
  tiersForSku,
  defaultTierForSku,
  getTier,
  quoteWorkspace,
  type WorkspaceSku,
  type PricingTier,
  type QuoteInput,
  type QuoteResult,
} from '@/lib/workspace/pricing';

export {
  createWorkspaceOwnerInvite,
  createWorkspaceInvite,
  claimWorkspaceInvite,
  peekWorkspaceInvite,
  buildClaimUrl,
  hashInviteToken,
  mintInviteToken,
  type WorkspaceInviteRole,
} from '@/lib/workspace/invites';

export {
  getWorkspaceMembership,
  listActiveMembershipsForUser,
  userCanManageWorkspaceBilling,
  userCanInviteWorkspaceFaculty,
  userCanCreateCoursesInWorkspace,
  assertWorkspaceAllowsCourseCreate,
  grantWorkspaceCompAccess,
  licenseHasOpenCompWindow,
} from '@/lib/workspace/entitlement';

export {
  removeWorkspaceMember,
  revokeWorkspaceInvite,
} from '@/lib/workspace/members';

export {
  provisionWorkspace,
  personalCreatorSlug,
  type ProvisionWorkspaceInput,
  type ProvisionWorkspaceResult,
} from '@/lib/workspace/provision';

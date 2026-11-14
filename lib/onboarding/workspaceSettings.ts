export type OnboardingChecklistKey =
  | 'materials'
  | 'outline'
  | 'publish'
  | 'share';

export type OnboardingChecklistState = Record<OnboardingChecklistKey, boolean>;

export const DEFAULT_ONBOARDING_CHECKLIST: OnboardingChecklistState = {
  materials: false,
  outline: false,
  publish: false,
  share: false,
};

export function parseWorkspaceSettings(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return raw && typeof raw === 'object' ? { ...raw } : {};
}

export function onboardingChecklistFromSettings(
  settings: Record<string, unknown> | null | undefined,
): OnboardingChecklistState {
  const raw = settings?.onboardingChecklist;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ONBOARDING_CHECKLIST };
  const o = raw as Record<string, unknown>;
  return {
    materials: Boolean(o.materials),
    outline: Boolean(o.outline),
    publish: Boolean(o.publish),
    share: Boolean(o.share),
  };
}

export function isCreatorWorkspaceUnverified(
  workspace: { type: string; settings?: Record<string, unknown> | null } | null | undefined,
): boolean {
  if (!workspace || workspace.type !== 'creator') return false;
  const settings = parseWorkspaceSettings(workspace.settings ?? undefined);
  return settings.verifiedSchool !== true;
}

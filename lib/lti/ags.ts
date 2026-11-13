import type { LtiToolConfig } from '@/lib/lti/config';
import { getPlatformAccessToken, AGS_SCOPES } from '@/lib/lti/tokens';

export type AgsLineItem = {
  id: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  tag?: string;
};

export async function createOrFindLineItem(
  config: LtiToolConfig,
  lineItemsUrl: string,
  input: {
    label: string;
    resourceId: string;
    scoreMaximum: number;
  },
): Promise<AgsLineItem> {
  const token = await getPlatformAccessToken(config, AGS_SCOPES);

  // Try find existing by resourceId
  const listUrl = new URL(lineItemsUrl);
  listUrl.searchParams.set('resource_id', input.resourceId);
  const listRes = await fetch(listUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json',
    },
  });
  if (listRes.ok) {
    const existing = (await listRes.json()) as AgsLineItem[];
    if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
      return existing[0];
    }
  }

  const createRes = await fetch(lineItemsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
      Accept: 'application/vnd.ims.lis.v2.lineitem+json',
    },
    body: JSON.stringify({
      scoreMaximum: input.scoreMaximum,
      label: input.label,
      resourceId: input.resourceId,
      tag: 'sol',
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '');
    throw new Error(
      `AGS create line item failed (${createRes.status}): ${text.slice(0, 400)}`,
    );
  }

  const created = (await createRes.json()) as AgsLineItem;
  if (!created.id) {
    throw new Error('AGS create line item response missing id');
  }
  return created;
}

export async function postScore(
  config: LtiToolConfig,
  lineItemUrl: string,
  input: {
    userId: string; // LTI user id (sub)
    scoreGiven: number | null;
    scoreMaximum: number;
    activityProgress: string;
    gradingProgress: string;
    comment?: string | null;
  },
): Promise<void> {
  const token = await getPlatformAccessToken(config, AGS_SCOPES);
  const scoresUrl = lineItemUrl.replace(/\/?\s*$/, '') + '/scores';

  const res = await fetch(scoresUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.ims.lis.v1.score+json',
    },
    body: JSON.stringify({
      userId: input.userId,
      scoreGiven: input.scoreGiven,
      scoreMaximum: input.scoreMaximum,
      activityProgress: input.activityProgress,
      gradingProgress: input.gradingProgress,
      comment: input.comment ?? undefined,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `AGS score post failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }
}

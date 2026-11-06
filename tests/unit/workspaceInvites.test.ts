import { describe, expect, it } from 'vitest';

import {
  buildClaimUrl,
  hashInviteToken,
  mintInviteToken,
} from '@/lib/workspace/invites';

describe('workspace invites', () => {
  it('hashes tokens stably', () => {
    const token = 'test-token-abc';
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toBe(hashInviteToken('other'));
  });

  it('mints unique tokens', () => {
    expect(mintInviteToken()).not.toBe(mintInviteToken());
    expect(mintInviteToken().length).toBeGreaterThan(20);
  });

  it('builds claim urls', () => {
    const url = buildClaimUrl('tok123', 'http://app.localhost:3000');
    expect(url).toContain('/workspaces/claim?token=tok123');
    expect(url.startsWith('http://app.localhost:3000')).toBe(true);
  });
});

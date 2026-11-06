import { exportJWK, importSPKI } from 'jose';

import { getLtiConfig } from '@/lib/lti/config';

/** Public JWKS for Canvas developer key registration. */
export async function getToolJwks(): Promise<{
  keys: Record<string, unknown>[];
}> {
  const cfg = getLtiConfig();
  if (!cfg.enabled) {
    return { keys: [] };
  }

  const key = await importSPKI(cfg.toolPublicKeyPem, 'RS256');
  const jwk = await exportJWK(key);
  return {
    keys: [
      {
        ...jwk,
        kid: cfg.toolKeyId,
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };
}

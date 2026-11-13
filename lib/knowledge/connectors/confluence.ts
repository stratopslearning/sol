import type { KnowledgeConnectorAdapter } from '@/lib/knowledge/connectors/types';
import type { OAuthTokenBundle } from '@/lib/knowledge/tokens';

/**
 * Confluence Cloud via Atlassian OAuth 3LO (or API token in config).
 * Env: ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET
 * Config: cloudId, spaceKey (optional filter)
 */
function clientCreds() {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set ATLASSIAN_CLIENT_ID and ATLASSIAN_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

export const confluenceAdapter: KnowledgeConnectorAdapter = {
  provider: 'confluence',
  displayName: 'Confluence',

  getAuthorizeUrl({ state, redirectUri }) {
    const { clientId } = clientCreds();
    const u = new URL('https://auth.atlassian.com/authorize');
    u.searchParams.set('audience', 'api.atlassian.com');
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('scope', 'read:confluence-content.all offline_access');
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('state', state);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('prompt', 'consent');
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const { clientId, clientSecret } = clientCreds();
    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`Atlassian token failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in
        ? Date.now() + json.expires_in * 1000
        : undefined,
      scope: json.scope,
    } satisfies OAuthTokenBundle;
  },

  async refreshTokens(tokens) {
    if (!tokens.refreshToken) return tokens;
    const { clientId, clientSecret } = clientCreds();
    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Atlassian refresh failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return {
      ...tokens,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? tokens.refreshToken,
      expiresAt: json.expires_in
        ? Date.now() + json.expires_in * 1000
        : undefined,
    };
  },

  async listDelta({ tokens, config }) {
    const cloudId = String(config.cloudId ?? '');
    if (!cloudId) throw new Error('Confluence config.cloudId is required');
    const spaceKey = config.spaceKey ? String(config.spaceKey) : null;
    const cql = spaceKey
      ? `type=page AND space="${spaceKey}" ORDER BY lastmodified DESC`
      : 'type=page ORDER BY lastmodified DESC';
    const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=50&expand=version,body.storage`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Confluence search failed: ${res.status}`);
    const json = (await res.json()) as {
      results?: Array<{
        id: string;
        title: string;
        version?: { when?: string; number?: number };
        body?: { storage?: { value?: string } };
        _links?: { webui?: string };
      }>;
    };

    return {
      cursor: null,
      files: (json.results ?? []).map((p) => ({
        externalId: p.id,
        title: p.title,
        mimeType: 'text/html',
        modifiedAt: p.version?.when ?? null,
        checksum: p.version?.number != null ? String(p.version.number) : null,
        path: p._links?.webui ?? p.title,
        textContent: p.body?.storage?.value
          ? stripHtml(p.body.storage.value)
          : null,
      })),
    };
  },

  async fetchFile({ tokens, file }) {
    if (file.textContent) {
      return { text: file.textContent, mimeType: 'text/plain' };
    }
    // Fallback: caller should have set cloudId on file via config in sync
    throw new Error('Confluence page body missing; re-run sync with expand');
  },
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

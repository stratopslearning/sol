import type { KnowledgeConnectorAdapter } from '@/lib/knowledge/connectors/types';
import type { OAuthTokenBundle } from '@/lib/knowledge/tokens';

const AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH = 'https://graph.microsoft.com/v1.0';

function clientCreds() {
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Set MICROSOFT_GRAPH_CLIENT_ID and MICROSOFT_GRAPH_CLIENT_SECRET',
    );
  }
  return { clientId, clientSecret };
}

const SCOPES = [
  'offline_access',
  'Files.Read.All',
  'Sites.Read.All',
  'User.Read',
].join(' ');

async function exchangeOrRefresh(
  body: Record<string, string>,
): Promise<OAuthTokenBundle> {
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined,
    tokenType: json.token_type,
    scope: json.scope,
  };
}

function makeMsAdapter(
  provider: 'onedrive' | 'sharepoint',
  displayName: string,
): KnowledgeConnectorAdapter {
  return {
    provider,
    displayName,

    getAuthorizeUrl({ state, redirectUri }) {
      const { clientId } = clientCreds();
      const u = new URL(AUTH);
      u.searchParams.set('client_id', clientId);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('redirect_uri', redirectUri);
      u.searchParams.set('response_mode', 'query');
      u.searchParams.set('scope', SCOPES);
      u.searchParams.set('state', state);
      return u.toString();
    },

    exchangeCode({ code, redirectUri }) {
      return exchangeOrRefresh({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: SCOPES,
      });
    },

    refreshTokens(tokens) {
      if (!tokens.refreshToken) return Promise.resolve(tokens);
      return exchangeOrRefresh({
        refresh_token: tokens.refreshToken,
        grant_type: 'refresh_token',
        scope: SCOPES,
      });
    },

    async listDelta({ tokens, config, cursor }) {
      let url: string;
      if (cursor) {
        url = cursor;
      } else if (provider === 'sharepoint') {
        const siteId = String(config.siteId ?? '');
        const driveId = String(config.driveId ?? '');
        if (!siteId) throw new Error('SharePoint config.siteId is required');
        url = driveId
          ? `${GRAPH}/sites/${siteId}/drives/${driveId}/root/delta`
          : `${GRAPH}/sites/${siteId}/drive/root/delta`;
      } else {
        const folderId = String(config.folderId ?? 'root');
        url =
          folderId === 'root'
            ? `${GRAPH}/me/drive/root/delta`
            : `${GRAPH}/me/drive/items/${folderId}/delta`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) throw new Error(`Graph delta failed: ${res.status}`);
      const json = (await res.json()) as {
        '@odata.nextLink'?: string;
        '@odata.deltaLink'?: string;
        value?: Array<{
          id: string;
          name?: string;
          file?: { mimeType?: string };
          folder?: unknown;
          deleted?: unknown;
          eTag?: string;
          lastModifiedDateTime?: string;
          size?: number;
          webUrl?: string;
        }>;
      };

      const siteId = String(config.siteId ?? '');
      const driveId = String(config.driveId ?? '');
      const files = (json.value ?? [])
        .filter((i) => i.file && !i.deleted && i.name)
        .map((i) => {
          let downloadUrl = `${GRAPH}/me/drive/items/${i.id}/content`;
          if (provider === 'sharepoint' && siteId) {
            downloadUrl = driveId
              ? `${GRAPH}/drives/${driveId}/items/${i.id}/content`
              : `${GRAPH}/sites/${siteId}/drive/items/${i.id}/content`;
          }
          return {
            externalId: i.id,
            title: i.name!,
            mimeType: i.file?.mimeType ?? null,
            checksum: i.eTag ?? null,
            modifiedAt: i.lastModifiedDateTime ?? null,
            byteSize: i.size ?? null,
            path: i.webUrl ?? i.name!,
            downloadUrl,
          };
        });

      return {
        files,
        cursor: json['@odata.nextLink'] ?? json['@odata.deltaLink'] ?? null,
      };
    },

    async fetchFile({ tokens, file }) {
      const url =
        file.downloadUrl ??
        `${GRAPH}/me/drive/items/${file.externalId}/content`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`Graph download failed: ${res.status}`);
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        mimeType: file.mimeType ?? 'application/octet-stream',
      };
    },
  };
}

export const oneDriveAdapter = makeMsAdapter('onedrive', 'OneDrive');
export const sharePointAdapter = makeMsAdapter('sharepoint', 'SharePoint');

import type { KnowledgeConnectorAdapter } from '@/lib/knowledge/connectors/types';
import type { OAuthTokenBundle } from '@/lib/knowledge/tokens';

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const DRIVE = 'https://www.googleapis.com/drive/v3';

function clientCreds() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET',
    );
  }
  return { clientId, clientSecret };
}

export const googleDriveAdapter: KnowledgeConnectorAdapter = {
  provider: 'google_drive',
  displayName: 'Google Drive',

  getAuthorizeUrl({ state, redirectUri }) {
    const { clientId } = clientCreds();
    const u = new URL(AUTH);
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set(
      'scope',
      [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ].join(' '),
    );
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const { clientId, clientSecret } = clientCreds();
    const res = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
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
    } satisfies OAuthTokenBundle;
  },

  async refreshTokens(tokens) {
    if (!tokens.refreshToken) return tokens;
    const { clientId, clientSecret } = clientCreds();
    const res = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Google refresh failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      ...tokens,
      accessToken: json.access_token,
      expiresAt: json.expires_in
        ? Date.now() + json.expires_in * 1000
        : undefined,
    };
  },

  async listDelta({ tokens, config, cursor }) {
    const folderId = String(config.folderId ?? 'root');
    const q = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`,
    );
    const pageToken = cursor ? `&pageToken=${encodeURIComponent(cursor)}` : '';
    const res = await fetch(
      `${DRIVE}/files?q=${q}&pageSize=50&fields=nextPageToken,files(id,name,mimeType,md5Checksum,modifiedTime,size)${pageToken}`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const json = (await res.json()) as {
      nextPageToken?: string;
      files?: Array<{
        id: string;
        name: string;
        mimeType?: string;
        md5Checksum?: string;
        modifiedTime?: string;
        size?: string;
      }>;
    };
    return {
      cursor: json.nextPageToken ?? null,
      files: (json.files ?? []).map((f) => ({
        externalId: f.id,
        title: f.name,
        mimeType: f.mimeType,
        checksum: f.md5Checksum ?? null,
        modifiedAt: f.modifiedTime ?? null,
        byteSize: f.size ? Number(f.size) : null,
        path: f.name,
      })),
    };
  },

  async fetchFile({ tokens, file }) {
    const mime = file.mimeType ?? '';
    // Google Docs → export as plain text / docx
    if (mime.startsWith('application/vnd.google-apps.')) {
      const exportMime =
        mime === 'application/vnd.google-apps.document'
          ? 'text/plain'
          : mime === 'application/vnd.google-apps.spreadsheet'
            ? 'text/csv'
            : 'application/pdf';
      const res = await fetch(
        `${DRIVE}/files/${file.externalId}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
      );
      if (!res.ok) throw new Error(`Drive export failed: ${res.status}`);
      if (exportMime.startsWith('text/')) {
        return { text: await res.text(), mimeType: exportMime };
      }
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        mimeType: exportMime,
      };
    }
    const res = await fetch(
      `${DRIVE}/files/${file.externalId}?alt=media`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      mimeType: mime || 'application/octet-stream',
    };
  },
};

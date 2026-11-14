import type { OAuthTokenBundle } from '@/lib/knowledge/tokens';

export type KnowledgeProvider =
  | 'google_drive'
  | 'onedrive'
  | 'sharepoint'
  | 'notion'
  | 'confluence';

export type ConnectorFile = {
  externalId: string;
  title: string;
  mimeType?: string | null;
  path?: string | null;
  checksum?: string | null;
  modifiedAt?: string | null;
  /** Downloadable bytes URL or export hint. */
  downloadUrl?: string | null;
  /** Pre-fetched text (Notion/Confluence pages). */
  textContent?: string | null;
  byteSize?: number | null;
};

export type ConnectorDelta = {
  files: ConnectorFile[];
  cursor?: string | null;
};

export type KnowledgeConnectorAdapter = {
  provider: KnowledgeProvider;
  displayName: string;
  /** OAuth authorize URL for this workspace callback. */
  getAuthorizeUrl: (opts: {
    workspaceId: string;
    state: string;
    redirectUri: string;
  }) => string;
  exchangeCode: (opts: {
    code: string;
    redirectUri: string;
  }) => Promise<OAuthTokenBundle>;
  refreshTokens?: (tokens: OAuthTokenBundle) => Promise<OAuthTokenBundle>;
  listDelta: (opts: {
    tokens: OAuthTokenBundle;
    config: Record<string, unknown>;
    cursor?: string | null;
  }) => Promise<ConnectorDelta>;
  fetchFile: (opts: {
    tokens: OAuthTokenBundle;
    file: ConnectorFile;
  }) => Promise<{ buffer?: Buffer; text?: string; mimeType?: string }>;
};

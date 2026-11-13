import type { KnowledgeProvider } from '@/lib/knowledge/connectors/types';

/**
 * Platform OAuth apps are SOL-owned. Faculty never enter client IDs —
 * ops sets these once per environment (.env.local / Vercel).
 */
const PROVIDER_ENV: Record<
  KnowledgeProvider,
  { id: string; secret: string; label: string }
> = {
  google_drive: {
    id: 'GOOGLE_DRIVE_CLIENT_ID',
    secret: 'GOOGLE_DRIVE_CLIENT_SECRET',
    label: 'Google Drive',
  },
  onedrive: {
    id: 'MICROSOFT_GRAPH_CLIENT_ID',
    secret: 'MICROSOFT_GRAPH_CLIENT_SECRET',
    label: 'OneDrive',
  },
  sharepoint: {
    id: 'MICROSOFT_GRAPH_CLIENT_ID',
    secret: 'MICROSOFT_GRAPH_CLIENT_SECRET',
    label: 'SharePoint',
  },
  notion: {
    id: 'NOTION_CLIENT_ID',
    secret: 'NOTION_CLIENT_SECRET',
    label: 'Notion',
  },
  confluence: {
    id: 'ATLASSIAN_CLIENT_ID',
    secret: 'ATLASSIAN_CLIENT_SECRET',
    label: 'Confluence',
  },
};

export function isConnectorProviderConfigured(
  provider: KnowledgeProvider,
): boolean {
  const keys = PROVIDER_ENV[provider];
  return Boolean(
    process.env[keys.id]?.trim() && process.env[keys.secret]?.trim(),
  );
}

export function connectorProviderEnvKeys(provider: KnowledgeProvider): {
  id: string;
  secret: string;
  label: string;
} {
  return PROVIDER_ENV[provider];
}

export function listConnectorProviderStatus(): Array<{
  provider: KnowledgeProvider;
  displayName: string;
  configured: boolean;
}> {
  return (Object.keys(PROVIDER_ENV) as KnowledgeProvider[]).map((provider) => ({
    provider,
    displayName: PROVIDER_ENV[provider].label,
    configured: isConnectorProviderConfigured(provider),
  }));
}

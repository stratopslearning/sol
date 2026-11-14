import { confluenceAdapter } from '@/lib/knowledge/connectors/confluence';
import { googleDriveAdapter } from '@/lib/knowledge/connectors/googleDrive';
import {
  oneDriveAdapter,
  sharePointAdapter,
} from '@/lib/knowledge/connectors/microsoft';
import { notionAdapter } from '@/lib/knowledge/connectors/notion';
import type {
  KnowledgeConnectorAdapter,
  KnowledgeProvider,
} from '@/lib/knowledge/connectors/types';

const adapters: Record<KnowledgeProvider, KnowledgeConnectorAdapter> = {
  google_drive: googleDriveAdapter,
  onedrive: oneDriveAdapter,
  sharepoint: sharePointAdapter,
  notion: notionAdapter,
  confluence: confluenceAdapter,
};

export function getConnectorAdapter(
  provider: KnowledgeProvider,
): KnowledgeConnectorAdapter {
  return adapters[provider];
}

export function listConnectorAdapters(): KnowledgeConnectorAdapter[] {
  return Object.values(adapters);
}

export {
  isConnectorProviderConfigured,
  connectorProviderEnvKeys,
  listConnectorProviderStatus,
} from '@/lib/knowledge/connectors/config';

export type { KnowledgeProvider, KnowledgeConnectorAdapter };

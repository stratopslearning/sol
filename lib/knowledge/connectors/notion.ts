import type { KnowledgeConnectorAdapter } from '@/lib/knowledge/connectors/types';
import type { OAuthTokenBundle } from '@/lib/knowledge/tokens';

const AUTH = 'https://api.notion.com/v1/oauth/authorize';
const TOKEN = 'https://api.notion.com/v1/oauth/token';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function clientCreds() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

async function notionFetch(
  path: string,
  tokens: OAuthTokenBundle,
  init?: RequestInit,
) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Notion API ${path} failed: ${res.status}`);
  return res.json();
}

export const notionAdapter: KnowledgeConnectorAdapter = {
  provider: 'notion',
  displayName: 'Notion',

  getAuthorizeUrl({ state, redirectUri }) {
    const { clientId } = clientCreds();
    const u = new URL(AUTH);
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('owner', 'user');
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const { clientId, clientSecret } = clientCreds();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(TOKEN, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`Notion token failed: ${res.status}`);
    const json = (await res.json()) as {
      access_token: string;
      token_type?: string;
      workspace_name?: string;
    };
    return {
      accessToken: json.access_token,
      tokenType: json.token_type,
      extra: { workspaceName: json.workspace_name },
    };
  },

  async listDelta({ tokens, config }) {
    const databaseId = config.databaseId
      ? String(config.databaseId)
      : null;
    // Search pages the integration can access
    const body = databaseId
      ? { filter: { property: 'object', value: 'page' } }
      : { filter: { value: 'page', property: 'object' }, page_size: 50 };
    const json = (await notionFetch('/search', tokens, {
      method: 'POST',
      body: JSON.stringify(body),
    })) as {
      results?: Array<{
        id: string;
        object: string;
        last_edited_time?: string;
        properties?: Record<string, { title?: Array<{ plain_text?: string }> }>;
        url?: string;
      }>;
    };

    const files = (json.results ?? [])
      .filter((r) => r.object === 'page')
      .filter((r) => !databaseId || true)
      .map((r) => {
        const titleProp = Object.values(r.properties ?? {}).find(
          (p) => Array.isArray(p.title),
        );
        const title =
          titleProp?.title?.map((t) => t.plain_text ?? '').join('') ||
          'Untitled page';
        return {
          externalId: r.id,
          title,
          mimeType: 'text/markdown',
          modifiedAt: r.last_edited_time ?? null,
          path: r.url ?? title,
        };
      });

    return { files, cursor: null };
  },

  async fetchFile({ tokens, file }) {
    const json = (await notionFetch(
      `/blocks/${file.externalId}/children?page_size=100`,
      tokens,
    )) as {
      results?: Array<{
        type: string;
        paragraph?: { rich_text?: Array<{ plain_text?: string }> };
        heading_1?: { rich_text?: Array<{ plain_text?: string }> };
        heading_2?: { rich_text?: Array<{ plain_text?: string }> };
        heading_3?: { rich_text?: Array<{ plain_text?: string }> };
        bulleted_list_item?: { rich_text?: Array<{ plain_text?: string }> };
        numbered_list_item?: { rich_text?: Array<{ plain_text?: string }> };
        code?: { rich_text?: Array<{ plain_text?: string }> };
      }>;
    };

    const lines: string[] = [`# ${file.title}`, ''];
    for (const block of json.results ?? []) {
      const rich =
        block.paragraph?.rich_text ??
        block.heading_1?.rich_text ??
        block.heading_2?.rich_text ??
        block.heading_3?.rich_text ??
        block.bulleted_list_item?.rich_text ??
        block.numbered_list_item?.rich_text ??
        block.code?.rich_text;
      const text = (rich ?? []).map((t) => t.plain_text ?? '').join('');
      if (!text) continue;
      if (block.heading_1) lines.push(`# ${text}`);
      else if (block.heading_2) lines.push(`## ${text}`);
      else if (block.heading_3) lines.push(`### ${text}`);
      else if (block.bulleted_list_item) lines.push(`- ${text}`);
      else if (block.numbered_list_item) lines.push(`1. ${text}`);
      else if (block.code) lines.push('```', text, '```');
      else lines.push(text);
      lines.push('');
    }
    return { text: lines.join('\n'), mimeType: 'text/markdown' };
  },
};

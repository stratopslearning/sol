import { describe, expect, it, vi } from 'vitest';

// Stub the db: protocol tests only exercise tools that either skip the db
// entirely (whoami, list_capabilities) or read professor enrollments
// (list_sections with an empty result).
vi.mock('@/app/db', () => ({
  db: {
    query: {
      professorSections: { findMany: async () => [] },
    },
    insert: () => ({ values: async () => undefined }),
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: null }),
  clerkClient: async () => ({}),
}));

import type { ProfessorApiAuth } from '@/lib/api/professorAuth';
import {
  handleMcpBody,
  handleMcpMessage,
  INVALID_PARAMS,
  LATEST_PROTOCOL_VERSION,
  METHOD_NOT_FOUND,
} from '@/lib/mcp/protocol';
import { MCP_TOOLS } from '@/lib/mcp/tools';

function authWith(scopes: ProfessorApiAuth['scopes']): ProfessorApiAuth {
  return {
    user: {
      id: 'user-1',
      clerkId: 'clerk-1',
      email: 'prof@example.edu',
      firstName: 'Pat',
      lastName: 'Professor',
      role: 'PROFESSOR',
      paid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    viaToken: true,
    tokenId: 'token-1',
    scopes,
  };
}

const fullAuth = authWith([
  'read',
  'sections:write',
  'quizzes:write',
  'grades:write',
  'discussions:write',
]);

describe('MCP protocol basics', () => {
  it('answers initialize with a supported protocol version', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26' },
      },
      fullAuth,
    );
    expect(res?.result).toMatchObject({
      protocolVersion: '2025-03-26',
      serverInfo: { name: 'sol-professor-mcp' },
    });
  });

  it('falls back to the latest version for unknown requests', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '1900-01-01' },
      },
      fullAuth,
    );
    expect(
      (res?.result as { protocolVersion: string }).protocolVersion,
    ).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('answers ping', async () => {
    const res = await handleMcpMessage(
      { jsonrpc: '2.0', id: 2, method: 'ping' },
      fullAuth,
    );
    expect(res?.result).toEqual({});
  });

  it('returns method-not-found for unknown methods', async () => {
    const res = await handleMcpMessage(
      { jsonrpc: '2.0', id: 3, method: 'resources/list' },
      fullAuth,
    );
    expect(res?.error?.code).toBe(METHOD_NOT_FOUND);
  });

  it('swallows notifications (no response)', async () => {
    const res = await handleMcpMessage(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      fullAuth,
    );
    expect(res).toBeNull();
  });
});

describe('tools/list', () => {
  it('lists every registered tool with an input schema', async () => {
    const res = await handleMcpMessage(
      { jsonrpc: '2.0', id: 4, method: 'tools/list' },
      fullAuth,
    );
    const tools = (res?.result as { tools: { name: string; inputSchema: unknown }[] })
      .tools;
    expect(tools.length).toBe(MCP_TOOLS.length);
    const createQuiz = tools.find((t) => t.name === 'create_quiz');
    expect(createQuiz).toBeDefined();
    expect(createQuiz!.inputSchema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['title', 'sectionIds', 'questions']),
    });
  });
});

describe('tools/call', () => {
  it('runs whoami and returns structured content', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'whoami', arguments: {} },
      },
      fullAuth,
    );
    const result = res?.result as {
      structuredContent: { email: string };
      isError?: boolean;
    };
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.email).toBe('prof@example.edu');
  });

  it('rejects unknown tools with invalid-params', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'drop_database', arguments: {} },
      },
      fullAuth,
    );
    expect(res?.error?.code).toBe(INVALID_PARAMS);
  });

  it('returns a tool error when the token lacks the scope', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'list_sections', arguments: {} },
      },
      authWith(['quizzes:write']),
    );
    const result = res?.result as {
      isError?: boolean;
      content: { text: string }[];
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'read' scope");
  });

  it('allows scoped reads when the scope is present', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'list_sections', arguments: {} },
      },
      authWith(['read']),
    );
    const result = res?.result as {
      isError?: boolean;
      structuredContent: { active: unknown[]; archived: unknown[] };
    };
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ active: [], archived: [] });
  });

  it('gates destructive tools behind confirm=true', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'archive_quiz',
          arguments: {
            quizId: '2e9d7b3a-1b1f-4f7e-9a76-1234567890ab',
            confirm: false,
          },
        },
      },
      fullAuth,
    );
    const result = res?.result as {
      isError?: boolean;
      content: { text: string }[];
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('needs_confirm');
  });

  it('rejects invalid arguments with issue details', async () => {
    const res = await handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: { name: 'get_quiz', arguments: { quizId: 'not-a-uuid' } },
      },
      fullAuth,
    );
    expect(res?.error?.code).toBe(INVALID_PARAMS);
    expect(res?.error?.data).toMatchObject({
      issues: [expect.objectContaining({ path: 'quizId' })],
    });
  });
});

describe('batches', () => {
  it('answers each request in a batch and skips notifications', async () => {
    const res = await handleMcpBody(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      ],
      fullAuth,
    );
    expect(Array.isArray(res)).toBe(true);
    expect((res as unknown[]).length).toBe(2);
  });

  it('returns null for notification-only bodies', async () => {
    const res = await handleMcpBody(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      fullAuth,
    );
    expect(res).toBeNull();
  });
});

/**
 * Minimal, stateless MCP server core (Streamable HTTP transport, JSON
 * responses). Handles the protocol surface a tools-only server needs:
 * initialize, ping, tools/list, tools/call, and notifications.
 *
 * Kept dependency-free and transport-agnostic so it can be unit tested
 * without HTTP and reused by the Next route handler.
 */
import { ApiError } from '@/lib/api/errors';
import type { ProfessorApiAuth } from '@/lib/api/professorAuth';
import { zodToJsonSchema } from '@/lib/mcp/jsonSchema';
import { MCP_TOOLS, MCP_TOOLS_BY_NAME } from '@/lib/mcp/tools';

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = {
  name: 'sol-professor-mcp',
  title: 'SOL Professor Tools',
  version: '1.0.0',
};

const SERVER_INSTRUCTIONS = `Tools for SOL (academic coursework platform) faculty. You act on behalf of the
authenticated professor: their sections, quizzes, gradebooks, and discussion
bots. Start with list_sections / list_quizzes to discover ids before calling
detail or mutation tools. Grades, attempts, and transcripts are FERPA
education records — every access is logged to the institution's audit trail.
Destructive tools (archive_quiz, leave_section, unassign_*, section_copy_quiz,
regrade_attention) require confirm=true; ask the user before setting it.`;

// JSON-RPC 2.0 error codes.
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function rpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined || message.id === null;
}

/** Tool result payload per the MCP spec. */
function toolResult(value: unknown, isError = false) {
  const structured =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
    ...(structured && !isError ? { structuredContent: structured } : {}),
    ...(isError ? { isError: true } : {}),
  };
}

async function handleToolsCall(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  auth: ProfessorApiAuth,
): Promise<JsonRpcResponse> {
  const name = params?.name;
  if (typeof name !== 'string') {
    return rpcError(id, INVALID_PARAMS, 'Missing tool name');
  }
  const tool = MCP_TOOLS_BY_NAME.get(name);
  if (!tool) {
    return rpcError(id, INVALID_PARAMS, `Unknown tool: ${name}`);
  }

  // Scope failures are reported as tool errors (not protocol errors) so the
  // agent can explain to the professor which scope the token is missing.
  if (tool.scope && !auth.scopes.includes(tool.scope)) {
    return rpcResult(
      id,
      toolResult(
        `Forbidden: this token is missing the '${tool.scope}' scope. Ask the professor to mint a token with that scope on the SOL Agent Access page.`,
        true,
      ),
    );
  }

  const rawArgs = (params?.arguments ?? {}) as Record<string, unknown>;
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return rpcError(id, INVALID_PARAMS, 'Invalid tool arguments', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (tool.destructive && parsed.data.confirm !== true) {
    return rpcResult(
      id,
      toolResult(
        `needs_confirm: '${name}' is destructive. Confirm with the professor, then call again with confirm=true.`,
        true,
      ),
    );
  }

  try {
    const value = await tool.handler(parsed.data, { auth });
    return rpcResult(id, toolResult(value));
  } catch (error) {
    if (error instanceof ApiError) {
      return rpcResult(
        id,
        toolResult(`${error.code ?? 'error'}: ${error.message}`, true),
      );
    }
    console.error(`[mcp] tool '${name}' failed:`, error);
    return rpcResult(
      id,
      toolResult('internal: The tool failed unexpectedly. Try again.', true),
    );
  }
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no response
 * body required).
 */
export async function handleMcpMessage(
  message: JsonRpcRequest,
  auth: ProfessorApiAuth,
): Promise<JsonRpcResponse | null> {
  if (
    !message ||
    typeof message !== 'object' ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    // Client responses (results of server-initiated requests) also land here;
    // a tools-only server never sends requests, so just ignore non-requests.
    if (message && typeof message === 'object' && !('method' in message)) {
      return null;
    }
    return rpcError(message?.id ?? null, INVALID_REQUEST, 'Invalid request');
  }

  if (isNotification(message)) {
    // notifications/initialized, notifications/cancelled, etc. — nothing to do.
    return null;
  }

  const id = message.id as string | number;

  switch (message.method) {
    case 'initialize': {
      const requested = message.params?.protocolVersion;
      const protocolVersion =
        typeof requested === 'string' &&
        SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION;
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, {
        tools: MCP_TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: zodToJsonSchema(tool.schema),
          ...(tool.destructive
            ? { annotations: { destructiveHint: true } }
            : { annotations: { destructiveHint: false } }),
        })),
      });
    case 'tools/call':
      return handleToolsCall(id, message.params, auth);
    default:
      return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`);
  }
}

/**
 * Handle a full POST body (single message or batch). Returns the JSON body
 * to send, or null when only notifications were received (HTTP 202).
 */
export async function handleMcpBody(
  body: unknown,
  auth: ProfessorApiAuth,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return rpcError(null, INVALID_REQUEST, 'Empty batch');
    }
    const responses: JsonRpcResponse[] = [];
    for (const message of body) {
      const response = await handleMcpMessage(message as JsonRpcRequest, auth);
      if (response) responses.push(response);
    }
    return responses.length > 0 ? responses : null;
  }
  return handleMcpMessage(body as JsonRpcRequest, auth);
}

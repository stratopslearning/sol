/**
 * Braintrust tracing helpers for SOL LLM and MCP surfaces.
 *
 * FERPA: metadata must never include Clerk IDs, emails, names, token IDs, or
 * raw gradebook payloads. Use hashId() for opaque identifiers.
 */
import { createHash } from 'crypto';

import { initLogger, traced, type Span } from 'braintrust';

export type AiSurface = 'grading' | 'rubric' | 'chatbot' | 'mcp';

export type McpToolOutcome =
  | 'success'
  | 'forbidden_scope'
  | 'invalid_args'
  | 'needs_confirm'
  | 'api_error'
  | 'internal'
  | 'unknown_tool'
  | 'missing_tool_name';

const FORBIDDEN_METADATA_KEYS = [
  'clerkid',
  'clerk_id',
  'studentemail',
  'student_email',
  'stripecustomerid',
  'actorclerkid',
  'tokenid',
  'firstname',
  'lastname',
  'gradebook',
  'transcript',
  'attempt',
];

let loggerInitialized = false;

export function isBraintrustEnabled(): boolean {
  return Boolean(process.env.BRAINTRUST_API_KEY?.trim());
}

/** SHA-256 prefix for opaque IDs in trace metadata. */
export function hashId(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function getBraintrustSampleRate(): number {
  const raw = process.env.BRAINTRUST_SAMPLE_RATE;
  if (raw !== undefined && raw !== '') {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return process.env.NODE_ENV === 'production' ? 0.2 : 1;
}

export function shouldSampleTrace(
  opts: { force?: boolean; isFailure?: boolean } = {},
): boolean {
  if (!isBraintrustEnabled()) return false;
  if (opts.force || opts.isFailure) return true;
  return Math.random() < getBraintrustSampleRate();
}

export function initBraintrustLogger(): void {
  if (!isBraintrustEnabled() || loggerInitialized) return;
  initLogger({
    projectName: process.env.BRAINTRUST_PROJECT?.trim() || 'SOL',
    apiKey: process.env.BRAINTRUST_API_KEY,
  });
  loggerInitialized = true;
}

/** Strip profile / education-record field names from trace metadata. */
export function buildSafeAiMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.some((f) => lower.includes(f))) continue;
    safe[key] = value;
  }
  return safe;
}

const noopSpan = { log: () => undefined } as unknown as Span;

/** Fire-and-forget span for post-hoc outcome logging (grading/chatbot). */
export async function logAiSpan(
  name: string,
  surface: AiSurface,
  metadata: Record<string, unknown>,
  opts: { isFailure?: boolean } = {},
): Promise<void> {
  if (!shouldSampleTrace(opts)) return;
  initBraintrustLogger();
  const safeMeta = buildSafeAiMetadata({ ...metadata, surface });
  await traced(
    async (span) => {
      span.log({ metadata: safeMeta });
    },
    { name, type: surface === 'mcp' ? 'task' : 'llm' },
  );
}

/** Wrap synchronous/async work in a sampled Braintrust span (MCP tools). */
export async function tracedAi<T>(
  name: string,
  surface: AiSurface,
  metadata: Record<string, unknown>,
  fn: () => Promise<T>,
  opts: { isFailure?: boolean } = {},
): Promise<T> {
  if (!shouldSampleTrace(opts)) return fn();
  initBraintrustLogger();
  const safeMeta = buildSafeAiMetadata({ ...metadata, surface });
  const started = Date.now();
  return traced(
    async (span) => {
      span.log({ metadata: safeMeta });
      try {
        const result = await fn();
        span.log({
          metadata: buildSafeAiMetadata({
            ...safeMeta,
            durationMs: Date.now() - started,
          }),
        });
        return result;
      } catch (err) {
        span.log({
          metadata: buildSafeAiMetadata({
            ...safeMeta,
            durationMs: Date.now() - started,
            error: err instanceof Error ? err.message : String(err),
          }),
        });
        throw err;
      }
    },
    { name, type: surface === 'mcp' ? 'task' : 'llm' },
  );
}

/** No-op span for callers that optionally log inside a callback. */
export function optionalSpan(): Span {
  return noopSpan;
}

/** Classify MCP tool/call responses for observability (no payloads). */
export function classifyMcpToolResponse(response: {
  result?: unknown;
  error?: { code: number; message: string };
}): McpToolOutcome {
  if (response.error) {
    if (response.error.code === -32602) return 'invalid_args';
    return 'internal';
  }
  const result = response.result as
    | { isError?: boolean; content?: Array<{ text?: string }> }
    | undefined;
  if (!result) return 'internal';
  const text = result.content?.[0]?.text ?? '';
  if (result.isError) {
    if (text.startsWith('needs_confirm:')) return 'needs_confirm';
    if (text.startsWith('Forbidden:')) return 'forbidden_scope';
    if (/^[a-z_]+:/i.test(text)) return 'api_error';
    return 'internal';
  }
  return 'success';
}

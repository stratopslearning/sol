/**
 * One-shot smoke test for the hosted professor MCP endpoint.
 *
 * Exercises the Streamable HTTP surface end to end with a real personal
 * access token: initialize → tools/list → whoami → list_sections →
 * list_quizzes, and verifies auth is enforced (bad token → 401).
 *
 *   SOL_MCP_URL=http://localhost:3000/learning/api/mcp \
 *   SOL_MCP_TOKEN=sol_pat_… \
 *   npx tsx scripts/smoke-mcp.ts
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

const MCP_URL = process.env.SOL_MCP_URL ?? 'http://localhost:3000/learning/api/mcp';
const TOKEN = process.env.SOL_MCP_TOKEN;

let nextId = 0;

async function rpc(
  method: string,
  params?: Record<string, unknown>,
  token: string | undefined = TOKEN,
): Promise<{ status: number; body: any }> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++nextId,
      method,
      ...(params ? { params } : {}),
    }),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  return rpc('tools/call', { name, arguments: args });
}

async function main() {
  if (!TOKEN) {
    throw new Error(
      'SOL_MCP_TOKEN is required (mint one on the Agent Access page)',
    );
  }

  const failures: string[] = [];
  const ok = (label: string) => console.log(`  ✓ ${label}`);
  const fail = (label: string, detail: unknown) => {
    failures.push(label);
    console.error(`  ✗ ${label}:`, detail);
  };

  console.log(`MCP smoke against ${MCP_URL}\n`);

  // Unauthenticated requests must be rejected.
  const noAuth = await rpc('initialize', { protocolVersion: '2025-06-18' }, 'sol_pat_bogus');
  if (noAuth.status === 401) ok('rejects invalid token with 401');
  else fail('rejects invalid token with 401', noAuth);

  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke', version: '0' },
  });
  if (init.status === 200 && init.body?.result?.serverInfo?.name === 'sol-professor-mcp') {
    ok(`initialize (protocol ${init.body.result.protocolVersion})`);
  } else fail('initialize', init);

  const tools = await rpc('tools/list');
  const toolNames: string[] =
    tools.body?.result?.tools?.map((t: { name: string }) => t.name) ?? [];
  if (tools.status === 200 && toolNames.includes('create_quiz')) {
    ok(`tools/list (${toolNames.length} tools)`);
  } else fail('tools/list', tools);

  const whoami = await callTool('whoami');
  const me = whoami.body?.result?.structuredContent;
  if (whoami.status === 200 && me?.role) {
    ok(`whoami (${me.email}, role ${me.role}, scopes ${me.scopes?.join('/')})`);
  } else fail('whoami', whoami);

  const sections = await callTool('list_sections');
  const sectionsResult = sections.body?.result;
  if (sections.status === 200 && !sectionsResult?.isError) {
    const active = sectionsResult?.structuredContent?.active?.length ?? 0;
    ok(`list_sections (${active} active)`);
  } else fail('list_sections', sections);

  const quizzes = await callTool('list_quizzes');
  if (quizzes.status === 200 && !quizzes.body?.result?.isError) {
    const count =
      quizzes.body?.result?.structuredContent?.quizzes?.length ?? 0;
    ok(`list_quizzes (${count} quizzes)`);
  } else fail('list_quizzes', quizzes);

  // Destructive tools must demand confirm=true.
  const gate = await callTool('archive_quiz', {
    quizId: '00000000-0000-0000-0000-000000000000',
    confirm: false,
  });
  const gateText = gate.body?.result?.content?.[0]?.text ?? '';
  if (gate.body?.result?.isError && gateText.includes('needs_confirm')) {
    ok('destructive tools gated behind confirm=true');
  } else fail('destructive confirm gate', gate);

  console.log(
    failures.length === 0
      ? '\nAll MCP smoke checks passed.'
      : `\n${failures.length} check(s) failed: ${failures.join(', ')}`,
  );
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

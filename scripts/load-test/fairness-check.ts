/**
 * Unit-style fairness check: job enqueue payloads must carry tenantId for
 * multi-tenant isolation. Inspects lib/jobs/enqueue.ts (no live Inngest).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enqueuePath = resolve(process.cwd(), 'lib/jobs/enqueue.ts');
const source = readFileSync(enqueuePath, 'utf8');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

assert(
  source.includes('inngestTenantPayload'),
  'enqueue module must define inngestTenantPayload',
);
assert(
  source.includes("key: 'event.data.tenantId'") ||
    source.includes('tenantId: workspaceId'),
  'enqueue should map workspaceId to tenantId in event payloads',
);

const sendBlocks = source.match(/inngest\.send\([\s\S]*?\}\);/g) ?? [];
assert(sendBlocks.length >= 3, 'expected multiple inngest.send call sites');

for (const block of sendBlocks) {
  if (block.includes('lti/passback.drain')) continue;
  assert(
    block.includes('tenantId') || block.includes('inngestTenantPayload'),
    `send block missing tenantId spread: ${block.slice(0, 80)}…`,
  );
}

console.log('OK: fairness-check passed for', sendBlocks.length, 'enqueue sites');

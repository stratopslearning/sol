/**
 * Remove files from eslint-legacy-authz-allowlist.json that no longer contain
 * any legacy users.role / professorId authorization comparisons (same regexes
 * as eslint-rules/no-legacy-authz.js), then print the new count.
 *
 *   node scripts/prune-legacy-authz-allowlist.mjs          # dry run
 *   node scripts/prune-legacy-authz-allowlist.mjs --write  # rewrite allowlist
 *   node scripts/prune-legacy-authz-allowlist.mjs --write --baseline  # also lower scripts/legacy-authz-baseline.txt
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const ALLOWLIST = join(ROOT, 'eslint-legacy-authz-allowlist.json');
const BASELINE = join(ROOT, 'scripts/legacy-authz-baseline.txt');

const ROLE_COMPARE =
  /(user|authUser|viewer|actor)\.role\s*===?\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]|['"`](STUDENT|PROFESSOR|ADMIN)['"`]\s*===?\s*(user|authUser|viewer|actor)\.role|\.role\s*!==?\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]/;
const PROFESSOR_ID_COMPARE =
  /(professorId|quiz\.professorId|bot\.professorId|chatbot\.professorId|interactive\.professorId)\s*===?\s*(user|authUser)\.id|(user|authUser)\.id\s*===?\s*(professorId|.*\.professorId)/;

const entries = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
const kept = [];
const dropped = [];
for (const rel of entries) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    dropped.push(rel);
    continue;
  }
  const text = readFileSync(abs, 'utf8');
  if (ROLE_COMPARE.test(text) || PROFESSOR_ID_COMPARE.test(text)) kept.push(rel);
  else dropped.push(rel);
}

console.log(`allowlist: ${entries.length} -> ${kept.length} (dropped ${dropped.length})`);
for (const d of dropped) console.log(`  - ${d}`);

if (process.argv.includes('--write')) {
  writeFileSync(ALLOWLIST, JSON.stringify(kept, null, 2) + '\n');
  if (process.argv.includes('--baseline')) {
    const out = execFileSync('node', ['--import', 'tsx', 'scripts/count-legacy-authz.ts'], {
      encoding: 'utf8',
    });
    const m = /legacy_authz_count=(\d+)/.exec(out);
    if (m) {
      const prev = Number(readFileSync(BASELINE, 'utf8').trim());
      const next = Number(m[1]);
      if (next < prev) {
        writeFileSync(BASELINE, `${next}\n`);
        console.log(`baseline ${prev} -> ${next}`);
      }
    }
  }
}

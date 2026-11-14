/**
 * Count legacy users.role / professorId authorization comparisons.
 * CI fails if count rises above scripts/legacy-authz-baseline.txt.
 *
 *   npx tsx scripts/count-legacy-authz.ts
 *   npx tsx scripts/count-legacy-authz.ts --check
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, 'scripts/legacy-authz-baseline.txt');
const ROOTS = ['app', 'lib', 'components'];

const PATTERN =
  /user\.role\s*===|user\.role\s*!==|\.role\s*===\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]|\.role\s*!==\s*['"`](STUDENT|PROFESSOR|ADMIN)['"`]|professorId\s*===\s*user\.id|user\.id\s*===\s*\w+\.professorId/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === '.worktrees') {
      continue;
    }
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function countInFile(path: string): number {
  const text = readFileSync(path, 'utf8');
  const matches = text.match(PATTERN);
  return matches?.length ?? 0;
}

function main(): void {
  let total = 0;
  const byFile: { file: string; count: number }[] = [];
  for (const root of ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      const count = countInFile(file);
      if (count > 0) {
        total += count;
        byFile.push({ file: relative(ROOT, file), count });
      }
    }
  }

  console.log(`legacy_authz_count=${total}`);
  if (process.argv.includes('--verbose')) {
    for (const row of byFile.sort((a, b) => b.count - a.count)) {
      console.log(`  ${row.count}\t${row.file}`);
    }
  }

  if (process.argv.includes('--check')) {
    const baseline = Number(readFileSync(BASELINE_PATH, 'utf8').trim());
    if (!Number.isFinite(baseline)) {
      console.error(`Invalid baseline at ${BASELINE_PATH}`);
      process.exit(1);
    }
    if (total > baseline) {
      console.error(
        `Legacy authz count ${total} exceeds baseline ${baseline}. Fix new checks or lower the baseline only after removing call sites.`,
      );
      process.exit(1);
    }
    console.log(`ok: count ${total} <= baseline ${baseline}`);
  }
}

main();

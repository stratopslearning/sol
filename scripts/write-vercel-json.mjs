#!/usr/bin/env node
/**
 * Emit vercel.json for the current deploy's BASE_PATH.
 *
 * - StratOps / local (default `/learning`): crons + apex rewrites under /learning
 * - Sol (`NEXT_PUBLIC_BASE_PATH=` empty): no crons (avoid double-firing vs StratOps);
 *   apex rewrites without /learning prefix
 *
 * Run from prebuild so each Vercel project gets the right file from the same repo.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'vercel.json');

function resolveBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH;
  if (raw === undefined) return '/learning';
  if (raw === '' || raw === '/') return '';
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const basePath = resolveBasePath();
const prefix = basePath; // '' or '/learning'

const apexDest = (path) => `${prefix}${path}`;

const rewrites = [
  {
    source: '/.well-known/:path*',
    destination: apexDest('/well-known/:path*'),
  },
  {
    source: '/llms.txt',
    destination: apexDest('/llms.txt'),
  },
  {
    source: '/robots.txt',
    destination: apexDest('/robots.txt'),
  },
  {
    source: '/sitemap.xml',
    destination: apexDest('/sitemap.xml'),
  },
];

/** Only StratOps runs crons while dual-hosting the same DB. */
const crons = basePath
  ? [
      {
        path: `${basePath}/api/cron/grade-pending`,
        schedule: '15 9 * * *',
      },
      {
        path: `${basePath}/api/cron/process-materials`,
        schedule: '30 9 * * *',
      },
      {
        path: `${basePath}/api/cron/lti-roster`,
        schedule: '45 9 * * *',
      },
      {
        path: `${basePath}/api/cron/lti-passback`,
        schedule: '20 9 * * *',
      },
    ]
  : [];

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  ...(crons.length ? { crons } : {}),
  rewrites,
};

writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(
  `[write-vercel-json] wrote vercel.json (BASE_PATH=${JSON.stringify(basePath)}, crons=${crons.length})`,
);

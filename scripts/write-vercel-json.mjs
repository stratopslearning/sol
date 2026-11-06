#!/usr/bin/env node
/**
 * Emit vercel.json for the current deploy's BASE_PATH.
 *
 * - StratOps / local (default `/learning`): crons + apex rewrites under /learning
 * - teachwithsol (`NEXT_PUBLIC_BASE_PATH=` empty): root `/api/cron/…` + apex rewrites
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

/** Cron paths follow BASE_PATH (StratOps `/learning/…`, teachwithsol `/api/…`). */
const cronPrefix = basePath; // '' or '/learning'
const crons = [
  {
    path: `${cronPrefix}/api/cron/grade-pending`,
    schedule: '15 9 * * *',
  },
  {
    path: `${cronPrefix}/api/cron/process-materials`,
    schedule: '30 9 * * *',
  },
  {
    path: `${cronPrefix}/api/cron/lti-roster`,
    schedule: '45 9 * * *',
  },
  {
    path: `${cronPrefix}/api/cron/lti-passback`,
    schedule: '20 9 * * *',
  },
  {
    path: `${cronPrefix}/api/cron/access-request-digest`,
    schedule: '0 10 * * *',
  },
];

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  // Match CI: package-lock.json is the source of truth (pnpm lock removed).
  installCommand: 'npm ci',
  ...(crons.length ? { crons } : {}),
  rewrites,
};

writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(
  `[write-vercel-json] wrote vercel.json (BASE_PATH=${JSON.stringify(basePath)}, crons=${crons.length})`,
);

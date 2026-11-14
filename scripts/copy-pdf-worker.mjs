#!/usr/bin/env node
/**
 * Copy pdf.js worker into public/ so client viewers can load it same-origin
 * (CSP worker-src 'self') without broken import.meta.url bundler URLs.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destDir = join(root, 'public');
mkdirSync(destDir, { recursive: true });

const copies = [
  [
    'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    'pdf.worker.min.mjs',
  ],
  [
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    'pdf.worker.legacy.min.mjs',
  ],
];

for (const [from, to] of copies) {
  const src = join(root, from);
  const dest = join(destDir, to);
  copyFileSync(src, dest);
  console.log(`Copied pdf.js worker → ${dest}`);
}

import mammoth from 'mammoth';

import { assertSafeMaterialUrlResolved } from '@/lib/knowledge/urlSafety';

/**
 * Extract plain text from uploaded bytes or a remote URL.
 * PDF/DOCX/TXT/MD for uploads; HTML/text fetch for URLs.
 */
export async function extractTextFromUpload(opts: {
  buffer: Buffer;
  mimeType: string | null | undefined;
  fileName?: string;
}): Promise<string> {
  const mime = (opts.mimeType ?? '').toLowerCase();
  const name = (opts.fileName ?? '').toLowerCase();

  if (
    mime === 'application/pdf' ||
    name.endsWith('.pdf')
  ) {
    // Force the Node CJS build. Next's bundler can resolve pdf-parse's
    // "browser" export, whose polyfills throw
    // "Object.defineProperty called on non-object" on real PDFs.
    const { createRequire } = await import('node:module');
    const { join } = await import('node:path');
    const require = createRequire(join(process.cwd(), 'package.json'));
    type PdfParser = {
      getText: () => Promise<{ text: string }>;
      destroy?: () => Promise<void>;
    };
    type PdfParseCtor = new (opts: { data: Uint8Array }) => PdfParser;
    const mod = require(
      join(
        process.cwd(),
        'node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs',
      ),
    ) as {
      PDFParse?: PdfParseCtor;
      default?: { PDFParse?: PdfParseCtor };
    };
    const PDFParse = mod.PDFParse ?? mod.default?.PDFParse;
    if (!PDFParse) {
      throw new Error('pdf-parse is unavailable in this runtime');
    }
    // Copy into a plain Uint8Array (avoids Buffer pool ArrayBuffer quirks).
    const data = Uint8Array.from(opts.buffer);
    const parser: PdfParser = new PDFParse({ data });
    try {
      const result = await parser.getText();
      return (result.text ?? '').trim();
    } finally {
      if (parser.destroy) await parser.destroy();
    }
  }

  if (
    mime.includes('wordprocessingml') ||
    mime === 'application/msword' ||
    name.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer: opts.buffer });
    return (result.value ?? '').trim();
  }

  if (
    mime.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.markdown')
  ) {
    return opts.buffer.toString('utf8').trim();
  }

  throw new Error(`Unsupported file type: ${mime || name || 'unknown'}`);
}

export async function extractTextFromUrl(url: string): Promise<string> {
  const safe = await assertSafeMaterialUrlResolved(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    // Manual redirect handling so each hop is re-validated (no open redirect SSRF).
    let current = safe.toString();
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      await assertSafeMaterialUrlResolved(current);
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'SOL-Knowledge/1.0' },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error(`Failed to fetch URL (${res.status})`);
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
    if (!res) throw new Error('Failed to fetch URL');
    if (!res.ok) {
      throw new Error(`Failed to fetch URL (${res.status})`);
    }
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) {
      throw new Error('Remote file exceeds 10 MB limit');
    }
    if (contentType.includes('pdf') || current.toLowerCase().endsWith('.pdf')) {
      return extractTextFromUpload({
        buffer: buf,
        mimeType: 'application/pdf',
        fileName: 'remote.pdf',
      });
    }
    if (
      contentType.includes('wordprocessingml') ||
      current.toLowerCase().endsWith('.docx')
    ) {
      return extractTextFromUpload({
        buffer: buf,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: 'remote.docx',
      });
    }
    let text = buf.toString('utf8');
    if (contentType.includes('html')) {
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

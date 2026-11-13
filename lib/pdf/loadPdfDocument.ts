'use client';

import type { PDFDocumentProxy } from 'pdfjs-dist';

import { withBasePath } from '@/lib/basePath';

type PdfjsModule = {
  getDocument: typeof import('pdfjs-dist').getDocument;
  GlobalWorkerOptions: typeof import('pdfjs-dist').GlobalWorkerOptions;
  version?: string;
};

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Load pdf.js once and point the worker at the same-origin public asset.
 * Avoids Next/webpack `import.meta.url` worker URLs that throw
 * "Object.defineProperty called on non-object" in dev.
 */
async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Prefer the legacy build — more compatible with Next bundlers than the
      // modern ESM entry, which is known to throw defineProperty errors in dev.
      let pdfjs: PdfjsModule;
      let workerPath = '/pdf.worker.min.mjs';
      try {
        pdfjs = (await import(
          'pdfjs-dist/legacy/build/pdf.mjs'
        )) as PdfjsModule;
        workerPath = '/pdf.worker.legacy.min.mjs';
      } catch {
        pdfjs = (await import('pdfjs-dist')) as PdfjsModule;
      }
      pdfjs.GlobalWorkerOptions.workerSrc = withBasePath(workerPath);
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/**
 * Fetch a same-origin PDF (with cookies) and open it via pdf.js.
 */
export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();

  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'Not authorized to preview this file'
        : `Could not load PDF (${res.status})`,
    );
  }

  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength < 5) {
    throw new Error('File is empty or not a PDF');
  }
  // %PDF-
  const head = String.fromCharCode(
    data[0]!,
    data[1]!,
    data[2]!,
    data[3]!,
    data[4]!,
  );
  if (head !== '%PDF-') {
    throw new Error('File is not a valid PDF');
  }

  return pdfjs.getDocument({
    data,
    // Avoid eval-based path that breaks under Next.js webpack source maps.
    isEvalSupported: false,
  }).promise;
}

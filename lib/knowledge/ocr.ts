/**
 * AWS Textract OCR fallback when PDF/image text extract is empty/thin.
 */
import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';

import { env } from '@/lib/env';

/** Below this char count, try OCR for PDFs/images. */
export const OCR_TEXT_THRESHOLD = 80;

let client: TextractClient | null = null;

function getClient(): TextractClient | null {
  const e = env();
  if (!e.AWS_REGION) return null;
  if (!client) client = new TextractClient({ region: e.AWS_REGION });
  return client;
}

export function shouldTryOcr(opts: {
  text: string;
  mimeType?: string | null;
  fileName?: string | null;
}): boolean {
  if ((opts.text ?? '').trim().length >= OCR_TEXT_THRESHOLD) return false;
  const mime = (opts.mimeType ?? '').toLowerCase();
  const name = (opts.fileName ?? '').toLowerCase();
  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    name.endsWith('.pdf') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.tif') ||
    name.endsWith('.tiff')
  );
}

/**
 * Sync DetectDocumentText (single-page / small docs).
 * Multi-page PDFs may return partial text; good enough as fallback.
 */
export async function ocrBufferWithTextract(buffer: Buffer): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error('Textract requires AWS_REGION');
  }
  // Textract sync API limit ~5MB for bytes
  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error('Document too large for synchronous Textract OCR');
  }
  const res = await c.send(
    new DetectDocumentTextCommand({
      Document: { Bytes: buffer },
    }),
  );
  const lines =
    res.Blocks?.filter((b) => b.BlockType === 'LINE' && b.Text).map(
      (b) => b.Text!,
    ) ?? [];
  return lines.join('\n').trim();
}

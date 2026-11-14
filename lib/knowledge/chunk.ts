import { CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS } from '@/lib/knowledge/constants';

export type TextChunk = {
  index: number;
  content: string;
  /** Rough char-based token estimate (chars / 4). */
  tokenCount: number;
};

/**
 * Split plain text into overlapping chunks. Pure function: unit-tested.
 */
export function chunkText(
  text: string,
  opts?: { targetChars?: number; overlapChars?: number },
): TextChunk[] {
  const target = opts?.targetChars ?? CHUNK_TARGET_CHARS;
  const overlap = opts?.overlapChars ?? CHUNK_OVERLAP_CHARS;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (normalized.length <= target) {
    return [
      {
        index: 0,
        content: normalized,
        tokenCount: Math.ceil(normalized.length / 4),
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < normalized.length) {
    let end = Math.min(start + target, normalized.length);
    if (end < normalized.length) {
      // Prefer breaking on paragraph / sentence / whitespace.
      const window = normalized.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf(' '),
      );
      if (breakAt > target * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push({
        index,
        content,
        tokenCount: Math.ceil(content.length / 4),
      });
      index += 1;
    }
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

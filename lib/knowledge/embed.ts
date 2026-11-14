import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from '@/app/db/schema';
import { getAiClient } from '@/lib/ai/gateway';
import { EMBEDDING_MODEL } from '@/lib/knowledge/constants';

const BATCH = 64;

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to embed course materials.');
  }
  return getAiClient('embed', { timeout: 60_000 });
}

/** Embed one query string (retrieval). */
export async function embedQuery(text: string): Promise<number[]> {
  const openai = client();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8_000),
  });
  const vector = res.data[0]?.embedding;
  if (!vector || vector.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
    throw new Error('Unexpected embedding dimensions from OpenAI');
  }
  return vector;
}

/** Embed many chunk texts in batches. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = client();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map((t) => t.slice(0, 8_000));
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: slice,
    });
    const ordered = [...res.data].sort((a, b) => a.index - b.index);
    for (const row of ordered) {
      if (row.embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
        throw new Error('Unexpected embedding dimensions from OpenAI');
      }
      out.push(row.embedding);
    }
  }
  return out;
}

/** Format a float vector for pgvector literal / bind. */
export function toPgVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zodToJsonSchema } from '@/lib/mcp/jsonSchema';

describe('zodToJsonSchema', () => {
  it('converts objects with required and optional fields', () => {
    const schema = z.object({
      title: z.string().describe('The title'),
      count: z.number().int().min(1),
      note: z.string().optional(),
      active: z.boolean().default(true),
    });
    expect(zodToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title' },
        count: { type: 'integer' },
        note: { type: 'string' },
        active: { type: 'boolean', default: true },
      },
      required: ['title', 'count'],
      additionalProperties: false,
    });
  });

  it('converts enums, arrays, and nullable unions', () => {
    const schema = z.object({
      type: z.enum(['A', 'B']),
      ids: z.array(z.string()),
      endsAt: z.union([z.string(), z.null()]),
      quizId: z.string().nullable(),
    });
    const json = zodToJsonSchema(schema) as {
      properties: Record<string, unknown>;
    };
    expect(json.properties.type).toEqual({ type: 'string', enum: ['A', 'B'] });
    expect(json.properties.ids).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
    expect(json.properties.endsAt).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
    expect(json.properties.quizId).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });

  it('converts nested object arrays (quiz questions shape)', () => {
    const schema = z.object({
      questions: z
        .array(
          z.object({
            question: z.string(),
            points: z.number().int().default(1),
          }),
        )
        .min(1),
    });
    const json = zodToJsonSchema(schema) as {
      properties: { questions: { items: { required: string[] } } };
      required: string[];
    };
    expect(json.required).toEqual(['questions']);
    expect(json.properties.questions.items.required).toEqual(['question']);
  });
});

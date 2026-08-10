/**
 * Minimal zod → JSON Schema converter for MCP tool input schemas.
 *
 * Supports exactly the subset used by `lib/mcp/tools.ts` (objects, strings,
 * numbers, booleans, enums, arrays, literals, optional/default/nullable
 * wrappers). Keeping this in-repo avoids a dependency and guarantees the
 * advertised schema matches what the zod validators actually accept.
 */
import { z } from 'zod';

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = schema._def as { typeName?: string; description?: string } & Record<
    string,
    unknown
  >;
  const description = def.description;
  const withDescription = (obj: JsonSchema): JsonSchema =>
    description ? { ...obj, description } : obj;

  switch (def.typeName) {
    case 'ZodString':
      return withDescription({ type: 'string' });
    case 'ZodNumber': {
      const checks = (def.checks as { kind: string }[] | undefined) ?? [];
      const isInt = checks.some((c) => c.kind === 'int');
      return withDescription({ type: isInt ? 'integer' : 'number' });
    }
    case 'ZodBoolean':
      return withDescription({ type: 'boolean' });
    case 'ZodNull':
      return withDescription({ type: 'null' });
    case 'ZodLiteral':
      return withDescription({ const: (def as { value: unknown }).value });
    case 'ZodEnum':
      return withDescription({
        type: 'string',
        enum: (def as { values: string[] }).values,
      });
    case 'ZodArray':
      return withDescription({
        type: 'array',
        items: zodToJsonSchema((def as { type: z.ZodTypeAny }).type),
      });
    case 'ZodOptional':
    case 'ZodDefault': {
      const inner = zodToJsonSchema(
        (def as { innerType: z.ZodTypeAny }).innerType,
      );
      const withDefault =
        def.typeName === 'ZodDefault'
          ? {
              ...inner,
              default: (def as { defaultValue: () => unknown }).defaultValue(),
            }
          : inner;
      return description ? { ...withDefault, description } : withDefault;
    }
    case 'ZodNullable': {
      const inner = zodToJsonSchema(
        (def as { innerType: z.ZodTypeAny }).innerType,
      );
      return withDescription({ anyOf: [inner, { type: 'null' }] });
    }
    case 'ZodUnion': {
      const options = (def as { options: z.ZodTypeAny[] }).options;
      return withDescription({ anyOf: options.map(zodToJsonSchema) });
    }
    case 'ZodEffects':
      return zodToJsonSchema((def as { schema: z.ZodTypeAny }).schema);
    case 'ZodObject': {
      const shape = (def as { shape: () => Record<string, z.ZodTypeAny> }).shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        if (!value.isOptional()) required.push(key);
      }
      return withDescription({
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        additionalProperties: false,
      });
    }
    default:
      return withDescription({});
  }
}

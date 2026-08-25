/**
 * Simulated professor-agent tool routing (no database).
 * Uses OpenAI function calling against the live MCP tool catalog.
 */
import OpenAI from 'openai';

import { zodToJsonSchema } from '@/lib/mcp/jsonSchema';
import { MCP_TOOLS } from '@/lib/mcp/tools';

export type McpRoutingResult = {
  toolName: string;
  args: Record<string, unknown>;
};

const ROUTING_MODEL = 'gpt-4.1-mini';

function mcpToolsForOpenAI() {
  return MCP_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
    },
  }));
}

export async function routeMcpIntent(intent: string): Promise<McpRoutingResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for MCP routing evals');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: ROUTING_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You route professor intents to exactly one SOL MCP tool. Use the tool definitions provided. For destructive tools, do NOT set confirm=true unless the user explicitly confirmed — prefer calling without confirm so the server can ask for confirmation.',
      },
      { role: 'user', content: intent },
    ],
    tools: mcpToolsForOpenAI(),
    tool_choice: 'required',
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== 'function') {
    return { toolName: '', args: {} };
  }

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
  } catch {
    args = {};
  }

  return { toolName: call.function.name, args };
}

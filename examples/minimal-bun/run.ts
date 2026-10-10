/**
 * Minimal Bun example: OpenRouter by default; pass --mock for a scripted LLM.
 *
 *   bun examples/minimal-bun/run.ts
 *   bun examples/minimal-bun/run.ts --mock
 *   bun examples/minimal-bun/run.ts --mock --trace
 *   (live: set OPENROUTER_API_KEY in repo-root .env)
 */

import {
  createHarness,
  createOpenRouterCallModel,
  runAgentLoop,
} from '../../src/index.ts';
import type { AgentLoopEvent, CallModelFn, ChatMessage } from '../../src/index.ts';

const mock = Bun.argv.includes('--mock');
const trace = Bun.argv.includes('--trace');
const kv = new Map<string, string>();

const harness = createHarness({
  kvStore: {
    get: async (key) => kv.get(key) ?? null,
    set: async (key, value) => {
      kv.set(key, value);
    },
  },
  hostTools: [
    {
      name: 'echo',
      description: 'Returns the input message prefixed with ECHO:',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
        additionalProperties: false,
      },
      execute: async ({ message }) => ({
        ok: true,
        echo: `ECHO:${String(message)}`,
      }),
    },
  ],
  callModel: mock ? createMockCallModel() : createLiveCallModel(),
});

const result = await runAgentLoop(harness, {
  systemMessage: 'You are a demo agent. Use tools when asked.',
  messages: [
    {
      role: 'user',
      content: 'Call echo with message "hello", then reply with the echo result.',
    },
  ],
  // Host-controlled; library stays silent unless you pass a handler.
  ...(trace ? { onEvent: traceEvent } : {}),
});

console.log('stopReason:', result.stopReason);
console.log('steps:', result.steps);
console.log('final assistant:', findLastAssistantContent(result.messages));
console.log('kv after run:', [...kv.entries()]);

function traceEvent(event: AgentLoopEvent): void {
  switch (event.type) {
    case 'step':
      console.log(`[trace] step ${event.step}/${event.maxSteps}`, {
        messageCount: event.messages.length,
        roles: event.messages.map((m) => m.role),
      });
      break;
    case 'assistant':
      console.log(`[trace] assistant @ step ${event.step}`, {
        content: event.message.content,
        toolCalls: event.message.tool_calls?.map((c) => c.function.name) ?? [],
      });
      break;
    case 'tool':
      console.log(`[trace] tool @ step ${event.step}`, {
        name: event.toolCall.function.name,
        args: event.toolCall.function.arguments,
        result: event.message.content,
      });
      break;
    case 'done':
      console.log(`[trace] done`, {
        steps: event.steps,
        stopReason: event.stopReason,
        messageCount: event.messages.length,
      });
      break;
  }
}

function findLastAssistantContent(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === 'assistant' && m.content) {
      return m.content;
    }
  }
  return null;
}

function createMockCallModel(): CallModelFn {
  let turn = 0;
  return async () => {
    turn += 1;
    if (turn === 1) {
      return {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'mock_call_1',
              type: 'function',
              function: {
                name: 'echo',
                arguments: JSON.stringify({ message: 'hello' }),
              },
            },
          ],
        },
      };
    }
    return {
      message: {
        role: 'assistant',
        content: 'The echo tool returned ECHO:hello.',
      },
    };
  };
}

function createLiveCallModel(): CallModelFn {
  const apiKey = Bun.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is required (set it in .env, or pass --mock)');
    throw new Error('OPENROUTER_API_KEY is required (set it in .env, or pass --mock)');
  }
  const model = Bun.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
  return createOpenRouterCallModel({
    apiKey,
    model,
    title: 'bubble-harness-example',
  });
}

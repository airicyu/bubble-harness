/**
 * Minimal Node example: mock LLM by default; pass --live for OpenRouter.
 *
 *   npm run build
 *   node examples/minimal-node/run.mjs
 *   OPENROUTER_API_KEY=sk-or-... node examples/minimal-node/run.mjs --live
 */

import {
  createHarness,
  createOpenRouterCallModel,
  runAgentLoop,
} from '../../dist/index.js';

const live = process.argv.includes('--live');
const kv = new Map();

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
        echo: `ECHO:${message}`,
      }),
    },
  ],
  callModel: live ? createLiveCallModel() : createMockCallModel(),
});

const result = await runAgentLoop(harness, {
  systemMessage: 'You are a demo agent. Use tools when asked.',
  messages: [
    {
      role: 'user',
      content: 'Call echo with message "hello", then reply with the echo result.',
    },
  ],
});

console.log('stopReason:', result.stopReason);
console.log('steps:', result.steps);
console.log('final assistant:', findLastAssistantContent(result.messages));
console.log('kv after run:', [...kv.entries()]);

function findLastAssistantContent(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === 'assistant' && m.content) {
      return m.content;
    }
  }
  return null;
}

function createMockCallModel() {
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

function createLiveCallModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is required for --live');
    process.exit(1);
  }
  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
  return createOpenRouterCallModel({
    apiKey,
    model,
    title: 'bubble-harness-example',
  });
}

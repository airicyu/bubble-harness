import { expect, test } from 'bun:test';
import { createHarness, runAgentLoop } from '../src/index.ts';
import type { AgentLoopEvent } from '../src/index.ts';

test('runAgentLoop completes after assistant message without tool_calls', async () => {
  let calls = 0;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => {
      calls += 1;
      return {
        message: { role: 'assistant', content: 'done' },
      };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'hi' }],
  });

  expect(calls).toBe(1);
  expect(result.stopReason).toBe('completed');
  expect(result.messages.at(-1)?.content).toBe('done');
});

test('tool failure returns structured error without stopping loop', async () => {
  let step = 0;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    hostTools: [
      {
        name: 'boom',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        execute: () => {
          throw new Error('kaboom');
        },
      },
    ],
    callModel: async ({ messages }) => {
      step += 1;
      if (step === 1) {
        return {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'boom', arguments: '{}' },
              },
            ],
          },
        };
      }
      const lastTool = messages.filter((m) => m.role === 'tool').pop();
      expect(lastTool?.content).toMatch(/"ok":false/);
      return { message: { role: 'assistant', content: 'recovered' } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'test' }],
  });
  expect(result.stopReason).toBe('completed');
  expect(result.steps).toBe(2);
});

test('onEvent receives step / assistant / tool / done in order', async () => {
  const events: AgentLoopEvent['type'][] = [];
  let step = 0;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    hostTools: [
      {
        name: 'echo',
        parameters: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
          additionalProperties: false,
        },
        execute: ({ message }) => ({ echo: String(message) }),
      },
    ],
    callModel: async () => {
      step += 1;
      if (step === 1) {
        return {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'c1',
                type: 'function',
                function: {
                  name: 'echo',
                  arguments: JSON.stringify({ message: 'hi' }),
                },
              },
            ],
          },
        };
      }
      return { message: { role: 'assistant', content: 'done' } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'go' }],
    onEvent: (event) => {
      events.push(event.type);
    },
  });

  expect(result.stopReason).toBe('completed');
  expect(events).toEqual([
    'step',
    'assistant',
    'tool',
    'step',
    'assistant',
    'done',
  ]);
});

test('tool results are truncated when oversized', async () => {
  let step = 0;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    toolResultMaxBytes: 200,
    hostTools: [
      {
        name: 'big',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        execute: () => 'x'.repeat(5000),
      },
    ],
    callModel: async () => {
      step += 1;
      if (step === 1) {
        return {
          message: {
            role: 'assistant',
            tool_calls: [
              {
                id: 'c1',
                type: 'function',
                function: { name: 'big', arguments: '{}' },
              },
            ],
          },
        };
      }
      return { message: { role: 'assistant', content: 'ok' } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'go' }],
  });
  const toolMsg = result.messages.find((m) => m.role === 'tool');
  expect(toolMsg?.content.includes('...[truncated]')).toBe(true);
});

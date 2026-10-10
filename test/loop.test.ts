import { expect, test } from 'bun:test';
import {
  createHarness,
  extractFinalText,
  runAgentLoop,
} from '../src/index.ts';
import type { AgentLoopEvent, ChatMessage } from '../src/index.ts';

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
  expect(result.finalText).toBe('done');
  expect(result.messages.at(-1)?.content).toBe('done');
});

test('empty final without tool_calls → empty_final', async () => {
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => ({
      message: { role: 'assistant', content: null },
    }),
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'hi' }],
  });

  expect(result.stopReason).toBe('empty_final');
  expect(result.finalText).toBe('');
});

test('retryEmptyFinal nudges once then can complete', async () => {
  let calls = 0;
  const events: AgentLoopEvent['type'][] = [];
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => {
      calls += 1;
      if (calls === 1) {
        return { message: { role: 'assistant', content: '   ' } };
      }
      return { message: { role: 'assistant', content: 'final answer' } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'hi' }],
    retryEmptyFinal: true,
    emptyFinalUserMessage: 'Please answer now.',
    onEvent: (event) => {
      events.push(event.type);
    },
  });

  expect(calls).toBe(2);
  expect(result.stopReason).toBe('completed');
  expect(result.finalText).toBe('final answer');
  expect(events).toContain('nudge');
  expect(result.messages.some((m) => m.role === 'user' && m.content === 'Please answer now.')).toBe(
    true,
  );
});

test('retryEmptyFinal still empty_final after retry', async () => {
  let calls = 0;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => {
      calls += 1;
      return { message: { role: 'assistant', content: null } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'hi' }],
    retryEmptyFinal: true,
    emptyFinalUserMessage: 'try again',
  });

  expect(calls).toBe(2);
  expect(result.stopReason).toBe('empty_final');
  expect(result.finalText).toBe('');
});

test('finalText skips assistant messages that have tool_calls', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'go' },
    {
      role: 'assistant',
      content: "I'll start by decoding…",
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'decode', arguments: '{}' },
        },
      ],
    },
    { role: 'tool', tool_call_id: 'c1', content: '{}' },
    { role: 'assistant', content: '  Risk report here  ' },
  ];

  expect(extractFinalText(messages)).toBe('Risk report here');
});

test('done event includes finalText and stopReason', async () => {
  let done: Extract<AgentLoopEvent, { type: 'done' }> | undefined;
  const harness = createHarness({
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => ({
      message: { role: 'assistant', content: 'ok' },
    }),
  });

  await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'hi' }],
    onEvent: (event) => {
      if (event.type === 'done') {
        done = event;
      }
    },
  });

  expect(done?.stopReason).toBe('completed');
  expect(done?.finalText).toBe('ok');
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

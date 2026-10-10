import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHarness, runAgentLoop } from '../dist/index.js';

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

  assert.equal(calls, 1);
  assert.equal(result.stopReason, 'completed');
  assert.equal(result.messages.at(-1)?.content, 'done');
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
      assert.match(lastTool.content, /"ok":false/);
      return { message: { role: 'assistant', content: 'recovered' } };
    },
  });

  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'test' }],
  });
  assert.equal(result.stopReason, 'completed');
  assert.equal(result.steps, 2);
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
  assert.ok(toolMsg.content.includes('...[truncated]'));
});

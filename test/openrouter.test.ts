import { expect, test } from 'bun:test';
import {
  createOpenRouterCallModel,
  normalizeOpenRouterMessageContent,
} from '../src/openrouter.ts';

test('normalize: reasoning_content fills null content', () => {
  expect(
    normalizeOpenRouterMessageContent({
      content: null,
      reasoning_content: 'hello',
    }),
  ).toBe('hello');
});

test('normalize: content-part array is joined', () => {
  expect(
    normalizeOpenRouterMessageContent({
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    }),
  ).toBe('ab');
});

test('normalize: whitespace-only content with no reasoning → null', () => {
  expect(
    normalizeOpenRouterMessageContent({
      content: '  ',
    }),
  ).toBeNull();
});

test('normalize: prefers non-empty content over reasoning', () => {
  expect(
    normalizeOpenRouterMessageContent({
      content: 'visible',
      reasoning_content: 'hidden',
    }),
  ).toBe('visible');
});

test('normalize: falls back to reasoning field', () => {
  expect(
    normalizeOpenRouterMessageContent({
      content: null,
      reasoning: 'from-reasoning',
    }),
  ).toBe('from-reasoning');
});

test('createOpenRouterCallModel applies normalize on response', async () => {
  const callModel = createOpenRouterCallModel({
    apiKey: 'test-key',
    model: 'test/model',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                reasoning_content: 'from reasoning',
              },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200 },
      ),
  });

  const result = await callModel({
    messages: [{ role: 'user', content: 'hi' }],
    tools: [],
  });

  expect(result.message.content).toBe('from reasoning');
});

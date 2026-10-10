import { expect, test } from 'bun:test';
import {
  createInProcessSandboxPorts,
  createSandboxGuest,
  createSandboxHost,
  runAgentLoop,
} from '../src/index.ts';

const emptySchema = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
};

test('in-process port delivers to the other side and unsubscribe stops delivery', () => {
  const { host, guest } = createInProcessSandboxPorts();
  const seen: unknown[] = [];
  const unsubscribe = host.onMessage((data) => {
    seen.push(data);
  });
  guest.postMessage({ hello: 1 });
  unsubscribe();
  guest.postMessage({ hello: 2 });
  expect(seen).toEqual([{ hello: 1 }]);
});

test('guest loop uses host kv and host tool execute; memory stays local', async () => {
  const store = new Map<string, string>();
  let hostToolCalls = 0;
  const { host, guest } = createInProcessSandboxPorts();
  const sandboxHost = createSandboxHost(host, {
    kvStore: {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => {
        store.set(key, value);
      },
    },
    callModel: async ({ messages }) => {
      const toolMessages = messages.filter((message) => message.role === 'tool');
      if (toolMessages.length === 0) {
        return {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_kv',
                type: 'function',
                function: { name: 'kv.set', arguments: '{"key":"a","value":"1"}' },
              },
              {
                id: 'call_mem',
                type: 'function',
                function: { name: 'memory.set', arguments: '{"key":"b","value":"2"}' },
              },
              {
                id: 'call_host',
                type: 'function',
                function: { name: 'ping', arguments: '{}' },
              },
            ],
          },
        };
      }
      return { message: { role: 'assistant', content: 'done' } };
    },
    hostTools: [
      {
        name: 'ping',
        parameters: emptySchema,
        execute: () => {
          hostToolCalls += 1;
          return { pong: true };
        },
      },
    ],
  });

  const harness = createSandboxGuest(guest, {
    hostToolSchemas: [{ name: 'ping', parameters: emptySchema }],
  });
  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'go' }],
  });

  expect(result.stopReason).toBe('completed');
  expect(store.get('a')).toBe('1');
  expect(hostToolCalls).toBe(1);
  expect(result.messages.some((message) => message.role === 'tool' && message.content.includes('pong'))).toBe(true);
  const memory = await harness.executeTool('memory.get', { key: 'b' });
  expect(memory).toBe('2');
  sandboxHost.close();
});

test('fetch allowlist blocks before the host fetchImpl runs', async () => {
  let fetched = 0;
  const { host, guest } = createInProcessSandboxPorts();
  createSandboxHost(host, {
    kvStore: { get: () => null, set: () => {} },
    fetchImpl: async () => {
      fetched += 1;
      return { status: 200, body: 'nope' };
    },
    callModel: async ({ messages }) => {
      if (!messages.some((message) => message.role === 'tool')) {
        return {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_fetch',
                type: 'function',
                function: { name: 'fetch', arguments: '{"url":"https://evil.test/x"}' },
              },
            ],
          },
        };
      }
      return { message: { role: 'assistant', content: 'stopped' } };
    },
  });
  const harness = createSandboxGuest(guest, {
    fetchAllowlist: ['https://ok.test/'],
  });
  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'fetch' }],
  });
  expect(fetched).toBe(0);
  expect(result.stopReason).toBe('completed');
  const tool = result.messages.find((message) => message.role === 'tool');
  expect(tool?.content).toMatch(/not allowed/);
});

test('callModel failure rejects the loop', async () => {
  const { host, guest } = createInProcessSandboxPorts();
  createSandboxHost(host, {
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => {
      throw new Error('model down');
    },
  });
  const harness = createSandboxGuest(guest);
  await expect(
    runAgentLoop(harness, { messages: [{ role: 'user', content: 'hi' }] }),
  ).rejects.toThrow('model down');
});

test('close message rejects a pending guest request without a shared map', async () => {
  const { host, guest } = createInProcessSandboxPorts();
  const sandboxHost = createSandboxHost(host, {
    kvStore: {
      get: () => new Promise(() => {}),
      set: () => {},
    },
    callModel: async () => ({ message: { role: 'assistant', content: 'unused' } }),
  });
  const harness = createSandboxGuest(guest);
  const pending = harness.executeTool('kv.get', { key: 'slow' });
  sandboxHost.close();
  await expect(pending).rejects.toThrow('Sandbox port closed');
});

test('host tool failure returns structured error and the loop continues', async () => {
  const { host, guest } = createInProcessSandboxPorts();
  let step = 0;
  createSandboxHost(host, {
    kvStore: { get: () => null, set: () => {} },
    hostTools: [
      {
        name: 'boom',
        parameters: emptySchema,
        execute: () => {
          throw new Error('kaboom');
        },
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
                id: 'call_boom',
                type: 'function',
                function: { name: 'boom', arguments: '{}' },
              },
            ],
          },
        };
      }
      return { message: { role: 'assistant', content: 'recovered' } };
    },
  });
  const harness = createSandboxGuest(guest, {
    hostToolSchemas: [{ name: 'boom', parameters: emptySchema }],
  });
  const result = await runAgentLoop(harness, {
    messages: [{ role: 'user', content: 'go' }],
  });
  const tool = result.messages.find((message) => message.role === 'tool');
  expect(tool?.content).toContain('"ok":false');
  expect(tool?.content).toContain('kaboom');
  expect(result.stopReason).toBe('completed');
});

test('non-serializable host tool result uses the contract error', async () => {
  const { host, guest } = createInProcessSandboxPorts();
  createSandboxHost(host, {
    kvStore: { get: () => null, set: () => {} },
    hostTools: [
      {
        name: 'fn',
        parameters: emptySchema,
        execute: () => ({ bad: () => 1 }),
      },
    ],
    callModel: async () => ({ message: { role: 'assistant', content: 'unused' } }),
  });
  const harness = createSandboxGuest(guest, {
    hostToolSchemas: [{ name: 'fn', parameters: emptySchema }],
  });
  await expect(harness.executeTool('fn', {})).rejects.toThrow('Result is not JSON-serializable');
});

test('duplicate host tool schema unsubscribes the guest', () => {
  const { guest } = createInProcessSandboxPorts();
  let listeners = 0;
  const port = {
    postMessage: guest.postMessage.bind(guest),
    onMessage(handler: (data: unknown) => void): () => void {
      listeners += 1;
      const unsubscribe = guest.onMessage(handler);
      return () => {
        listeners -= 1;
        unsubscribe();
      };
    },
  };
  expect(() =>
    createSandboxGuest(port, {
      hostToolSchemas: [{ name: 'kv.get', parameters: emptySchema }],
    }),
  ).toThrow(/conflicts with system tool/);
  expect(listeners).toBe(0);
});

test('kv.get null is preserved across the port', async () => {
  const { host, guest } = createInProcessSandboxPorts();
  createSandboxHost(host, {
    kvStore: { get: () => null, set: () => {} },
    callModel: async () => ({ message: { role: 'assistant', content: 'unused' } }),
  });
  const harness = createSandboxGuest(guest);
  await expect(harness.executeTool('kv.get', { key: 'missing' })).resolves.toBeNull();
});

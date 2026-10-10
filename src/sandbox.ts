import { createHarness } from './harness.ts';
import { defaultFetchImpl } from './tools/system.ts';
import type {
  CallModelFn,
  CallModelRequest,
  CallModelResult,
  FetchAllowlistEntry,
  FetchImpl,
  FetchRequest,
  FetchResponse,
  Harness,
  HostToolDefinition,
  JsonSchemaObject,
  KVStore,
} from './types.ts';

export interface SandboxPort {
  postMessage(data: unknown): void;
  onMessage(handler: (data: unknown) => void): () => void;
}

export type SandboxOp = 'kv.get' | 'kv.set' | 'fetch' | 'callModel' | 'hostTool';

export interface SandboxRequest {
  kind: 'bubble-harness.sandbox';
  id: string;
  op: SandboxOp;
  payload: unknown;
}

export interface SandboxClose {
  kind: 'bubble-harness.sandbox.close';
}

export interface SandboxResponse {
  kind: 'bubble-harness.sandbox.result';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface SandboxHostToolSchema {
  name: string;
  description?: string;
  parameters: JsonSchemaObject;
}

export interface SandboxGuestOptions {
  fetchAllowlist?: FetchAllowlistEntry[];
  hostToolSchemas?: SandboxHostToolSchema[];
  maxSteps?: number;
  toolResultMaxBytes?: number;
}

export interface SandboxHostHandlers {
  kvStore: KVStore;
  callModel: CallModelFn;
  fetchImpl?: FetchImpl;
  hostTools?: HostToolDefinition[];
}

const REQUEST_KIND = 'bubble-harness.sandbox';
const RESULT_KIND = 'bubble-harness.sandbox.result';
const CLOSE_KIND = 'bubble-harness.sandbox.close';

export function createInProcessSandboxPorts(): { host: SandboxPort; guest: SandboxPort } {
  const hostListeners = new Set<(data: unknown) => void>();
  const guestListeners = new Set<(data: unknown) => void>();

  return {
    guest: {
      postMessage(data: unknown): void {
        for (const listener of [...hostListeners]) {
          listener(data);
        }
      },
      onMessage(handler: (data: unknown) => void): () => void {
        guestListeners.add(handler);
        return () => {
          guestListeners.delete(handler);
        };
      },
    },
    host: {
      postMessage(data: unknown): void {
        for (const listener of [...guestListeners]) {
          listener(data);
        }
      },
      onMessage(handler: (data: unknown) => void): () => void {
        hostListeners.add(handler);
        return () => {
          hostListeners.delete(handler);
        };
      },
    },
  };
}

export function createSandboxGuest(port: SandboxPort, options: SandboxGuestOptions = {}): Harness {
  const pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  let nextId = 0;
  let closed = false;

  const unsubscribe = port.onMessage((data: unknown) => {
    const message = decodeMessage(data);
    if (!message) {
      return;
    }
    if (message.kind === CLOSE_KIND) {
      closed = true;
      rejectPending(pending, new Error('Sandbox port closed'));
      unsubscribe();
      return;
    }
    if (message.kind !== RESULT_KIND || typeof message.id !== 'string') {
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) {
      return;
    }
    pending.delete(message.id);
    if (message.ok === true) {
      if (!Object.prototype.hasOwnProperty.call(message, 'result')) {
        waiter.reject(new Error('Sandbox request failed'));
        return;
      }
      waiter.resolve(message.result);
      return;
    }
    const error = typeof message.error === 'string' ? message.error : 'Sandbox request failed';
    waiter.reject(new Error(error));
  });

  async function request(op: SandboxOp, payload: unknown): Promise<unknown> {
    if (closed) {
      throw new Error('Sandbox port closed');
    }
    const id = String(++nextId);
    const promise = new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    port.postMessage({ kind: REQUEST_KIND, id, op, payload });
    return promise;
  }

  const kvStore: KVStore = {
    async get(key: string): Promise<string | null> {
      const result = await request('kv.get', { key });
      if (result === null) {
        return null;
      }
      if (typeof result !== 'string') {
        throw new Error('Sandbox request failed');
      }
      return result;
    },
    async set(key: string, value: string): Promise<void> {
      await request('kv.set', { key, value });
    },
  };

  const fetchImpl: FetchImpl = async (req: FetchRequest): Promise<FetchResponse> => {
    const result = await request('fetch', req);
    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as FetchResponse).status !== 'number' ||
      typeof (result as FetchResponse).body !== 'string'
    ) {
      throw new Error('Sandbox request failed');
    }
    return result as FetchResponse;
  };

  const callModel: CallModelFn = async (req: CallModelRequest): Promise<CallModelResult> => {
    const result = await request('callModel', req);
    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as CallModelResult).message !== 'object' ||
      (result as CallModelResult).message === null
    ) {
      throw new Error('Sandbox request failed');
    }
    return result as CallModelResult;
  };

  const hostTools: HostToolDefinition[] = (options.hostToolSchemas ?? []).map((schema) => ({
    name: schema.name,
    description: schema.description,
    parameters: schema.parameters,
    execute: (args) => request('hostTool', { name: schema.name, args }),
  }));

  try {
    return createHarness({
      kvStore,
      callModel,
      fetchImpl,
      fetchAllowlist: options.fetchAllowlist,
      hostTools,
      maxSteps: options.maxSteps,
      toolResultMaxBytes: options.toolResultMaxBytes,
    });
  } catch (err) {
    unsubscribe();
    rejectPending(pending, new Error('Sandbox port closed'));
    throw err;
  }
}

export function createSandboxHost(
  port: SandboxPort,
  handlers: SandboxHostHandlers,
): { close(): void } {
  const fetchImpl = handlers.fetchImpl ?? defaultFetchImpl;
  const hostByName = new Map<string, HostToolDefinition>();
  for (const tool of handlers.hostTools ?? []) {
    if (hostByName.has(tool.name)) {
      throw new Error(`Duplicate host tool name: ${tool.name}`);
    }
    hostByName.set(tool.name, tool);
  }

  let closed = false;
  const unsubscribe = port.onMessage((data: unknown) => {
    if (closed) {
      return;
    }
    const message = decodeMessage(data);
    if (!message || message.kind !== REQUEST_KIND) {
      return;
    }
    if (typeof message.id !== 'string' || typeof message.op !== 'string') {
      return;
    }
    void handleRequest(port, fetchImpl, hostByName, handlers, message.id, message.op, message.payload);
  });

  return {
    close(): void {
      if (closed) {
        return;
      }
      closed = true;
      port.postMessage({ kind: CLOSE_KIND });
      unsubscribe();
    },
  };
}

async function handleRequest(
  port: SandboxPort,
  fetchImpl: FetchImpl,
  hostByName: Map<string, HostToolDefinition>,
  handlers: SandboxHostHandlers,
  id: string,
  op: string,
  payload: unknown,
): Promise<void> {
  try {
    const result = jsonClone(await dispatch(fetchImpl, hostByName, handlers, op, payload));
    const response = {
      kind: RESULT_KIND,
      id,
      ok: true,
      result,
    };
    try {
      JSON.stringify(response);
    } catch {
      port.postMessage({
        kind: RESULT_KIND,
        id,
        ok: false,
        error: 'Result is not JSON-serializable',
      });
      return;
    }
    port.postMessage(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    port.postMessage({
      kind: RESULT_KIND,
      id,
      ok: false,
      error,
    });
  }
}

async function dispatch(
  fetchImpl: FetchImpl,
  hostByName: Map<string, HostToolDefinition>,
  handlers: SandboxHostHandlers,
  op: string,
  payload: unknown,
): Promise<unknown> {
  const body = asRecord(payload);
  switch (op) {
    case 'kv.get':
      return handlers.kvStore.get(requireString(body, 'key'));
    case 'kv.set':
      await handlers.kvStore.set(requireString(body, 'key'), requireString(body, 'value'));
      return { ok: true };
    case 'fetch':
      return fetchImpl({
        url: requireString(body, 'url'),
        method: optionalString(body, 'method'),
        headers: optionalHeaders(body, 'headers'),
        body: optionalString(body, 'body'),
      });
    case 'callModel':
      return handlers.callModel(body as unknown as CallModelRequest);
    case 'hostTool': {
      const name = requireString(body, 'name');
      const tool = hostByName.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const args = body.args;
      if (typeof args !== 'object' || args === null || Array.isArray(args)) {
        throw new Error('Host tool args must be a JSON object');
      }
      return tool.execute(args as Record<string, unknown>);
    }
    default:
      throw new Error(`Unknown sandbox op: ${op}`);
  }
}

function jsonClone(value: unknown): unknown {
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error('Result is not JSON-serializable');
    }
    const cloned: unknown = JSON.parse(encoded);
    if (!sameJsonShape(value, cloned)) {
      throw new Error('Result is not JSON-serializable');
    }
    return cloned;
  } catch (err) {
    if (err instanceof Error && err.message === 'Result is not JSON-serializable') {
      throw err;
    }
    throw new Error('Result is not JSON-serializable');
  }
}

function sameJsonShape(value: unknown, cloned: unknown): boolean {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return false;
  }
  if (value === null || typeof value !== 'object') {
    return value === cloned;
  }
  if (Array.isArray(value)) {
    if (!Array.isArray(cloned) || value.length !== cloned.length) {
      return false;
    }
    return value.every((item, index) => sameJsonShape(item, cloned[index]));
  }
  if (typeof cloned !== 'object' || cloned === null || Array.isArray(cloned)) {
    return false;
  }
  const originalKeys = Object.keys(value as Record<string, unknown>);
  const clonedKeys = Object.keys(cloned as Record<string, unknown>);
  if (originalKeys.length !== clonedKeys.length) {
    return false;
  }
  return originalKeys.every((key) =>
    sameJsonShape(
      (value as Record<string, unknown>)[key],
      (cloned as Record<string, unknown>)[key],
    ),
  );
}

function decodeMessage(data: unknown): Record<string, unknown> | null {
  try {
    const cloned: unknown = JSON.parse(JSON.stringify(data));
    if (typeof cloned !== 'object' || cloned === null || Array.isArray(cloned)) {
      return null;
    }
    return cloned as Record<string, unknown>;
  } catch {
    return null;
  }
}

function rejectPending(
  pending: Map<string, { reject: (reason: Error) => void }>,
  error: Error,
): void {
  for (const waiter of pending.values()) {
    waiter.reject(error);
  }
  pending.clear();
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Sandbox payload must be a JSON object');
  }
  return payload as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
}

function optionalHeaders(
  body: Record<string, unknown>,
  key: string,
): Record<string, string> | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected headers object: ${key}`);
  }
  const headers: Record<string, string> = {};
  for (const [header, headerValue] of Object.entries(value)) {
    if (typeof headerValue !== 'string') {
      throw new Error(`Expected string header: ${header}`);
    }
    headers[header] = headerValue;
  }
  return headers;
}

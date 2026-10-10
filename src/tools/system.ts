import type {
  FetchAllowlistEntry,
  FetchImpl,
  FetchRequest,
  KVStore,
} from '../types.js';
import { SYSTEM_TOOL_NAMES } from './schemas.js';

export function isUrlAllowed(url: string, allowlist?: FetchAllowlistEntry[]): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  for (const entry of allowlist) {
    if (typeof entry === 'string') {
      if (url.startsWith(entry)) {
        return true;
      }
    } else if (entry.test(url)) {
      return true;
    }
  }
  return false;
}

export async function defaultFetchImpl(req: FetchRequest): Promise<{ status: number; body: string }> {
  const method = req.method ?? 'GET';
  const headers = req.headers ?? {};
  const response = await fetch(req.url, {
    method,
    headers,
    body: req.body,
  });
  const body = await response.text();
  return { status: response.status, body };
}

export interface SystemToolContext {
  kvStore: KVStore;
  memory: Map<string, string>;
  fetchImpl: FetchImpl;
  fetchAllowlist?: FetchAllowlistEntry[];
}

export async function executeSystemTool(
  name: string,
  args: Record<string, unknown>,
  ctx: SystemToolContext,
): Promise<unknown> {
  switch (name) {
    case SYSTEM_TOOL_NAMES.KV_GET: {
      const key = requireString(args, 'key');
      return await ctx.kvStore.get(key);
    }
    case SYSTEM_TOOL_NAMES.KV_SET: {
      const key = requireString(args, 'key');
      const value = requireString(args, 'value');
      await ctx.kvStore.set(key, value);
      return { ok: true };
    }
    case SYSTEM_TOOL_NAMES.MEMORY_GET: {
      const key = requireString(args, 'key');
      return ctx.memory.get(key) ?? null;
    }
    case SYSTEM_TOOL_NAMES.MEMORY_SET: {
      const key = requireString(args, 'key');
      const value = requireString(args, 'value');
      ctx.memory.set(key, value);
      return { ok: true };
    }
    case SYSTEM_TOOL_NAMES.FETCH: {
      const url = requireString(args, 'url');
      if (!isUrlAllowed(url, ctx.fetchAllowlist)) {
        throw new Error(`URL not allowed by fetch allowlist: ${url}`);
      }
      const method = optionalString(args, 'method');
      const body = optionalString(args, 'body');
      const headers = optionalHeaders(args, 'headers');
      return await ctx.fetchImpl({
        url,
        method,
        headers,
        body,
      });
    }
    default:
      throw new Error(`Unknown system tool: ${name}`);
  }
}

function requireString(args: Record<string, unknown>, field: string): string {
  const value = args[field];
  if (typeof value !== 'string') {
    throw new Error(`Expected string "${field}"`);
  }
  return value;
}

function optionalString(args: Record<string, unknown>, field: string): string | undefined {
  const value = args[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string "${field}"`);
  }
  return value;
}

function optionalHeaders(
  args: Record<string, unknown>,
  field: string,
): Record<string, string> | undefined {
  const value = args[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected object "${field}"`);
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== 'string') {
      throw new Error(`Header "${k}" must be a string`);
    }
    out[k] = v;
  }
  return out;
}

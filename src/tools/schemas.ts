import type { JsonSchemaObject, ToolDefinitionForApi } from '../types.ts';

const keyValueGetSchema: JsonSchemaObject = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'Storage key' },
  },
  required: ['key'],
  additionalProperties: false,
};

const keyValueSetSchema: JsonSchemaObject = {
  type: 'object',
  properties: {
    key: { type: 'string', description: 'Storage key' },
    value: { type: 'string', description: 'String value to store' },
  },
  required: ['key', 'value'],
  additionalProperties: false,
};

const fetchSchema: JsonSchemaObject = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'HTTP(S) URL' },
    method: { type: 'string', description: 'HTTP method, default GET' },
    headers: {
      type: 'object',
      description: 'Optional request headers',
      additionalProperties: { type: 'string' },
    },
    body: { type: 'string', description: 'Optional request body' },
  },
  required: ['url'],
  additionalProperties: false,
};

export const SYSTEM_TOOL_NAMES = {
  KV_GET: 'kv.get',
  KV_SET: 'kv.set',
  MEMORY_GET: 'memory.get',
  MEMORY_SET: 'memory.set',
  FETCH: 'fetch',
} as const;

export type SystemToolName = (typeof SYSTEM_TOOL_NAMES)[keyof typeof SYSTEM_TOOL_NAMES];

export function buildSystemToolDefinitions(): ToolDefinitionForApi[] {
  return [
    {
      type: 'function',
      function: {
        name: SYSTEM_TOOL_NAMES.KV_GET,
        description: 'Read a string value from the host-injected key-value store.',
        parameters: keyValueGetSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: SYSTEM_TOOL_NAMES.KV_SET,
        description: 'Write a string value to the host-injected key-value store.',
        parameters: keyValueSetSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: SYSTEM_TOOL_NAMES.MEMORY_GET,
        description: 'Read a session-scoped in-memory string (not persisted).',
        parameters: keyValueGetSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: SYSTEM_TOOL_NAMES.MEMORY_SET,
        description: 'Write a session-scoped in-memory string (not persisted).',
        parameters: keyValueSetSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: SYSTEM_TOOL_NAMES.FETCH,
        description: 'HTTP(S) fetch with optional host URL allowlist.',
        parameters: fetchSchema,
      },
    },
  ];
}

import type {
  Harness,
  HarnessOptions,
  HostToolDefinition,
  ToolDefinitionForApi,
} from './types.ts';
import { buildSystemToolDefinitions, SYSTEM_TOOL_NAMES } from './tools/schemas.ts';
import {
  defaultFetchImpl,
  executeSystemTool,
  type SystemToolContext,
} from './tools/system.ts';

const RESERVED_NAMES = new Set<string>(Object.values(SYSTEM_TOOL_NAMES));

export function createHarness(options: HarnessOptions): Harness {
  const hostTools = options.hostTools ?? [];
  for (const tool of hostTools) {
    if (RESERVED_NAMES.has(tool.name)) {
      throw new Error(`Host tool name conflicts with system tool: ${tool.name}`);
    }
  }

  const memory = new Map<string, string>();
  const fetchImpl = options.fetchImpl ?? defaultFetchImpl;
  const systemCtx: SystemToolContext = {
    kvStore: options.kvStore,
    memory,
    fetchImpl,
    fetchAllowlist: options.fetchAllowlist,
  };

  const hostByName = new Map<string, HostToolDefinition>();
  for (const tool of hostTools) {
    if (hostByName.has(tool.name)) {
      throw new Error(`Duplicate host tool name: ${tool.name}`);
    }
    hostByName.set(tool.name, tool);
  }

  const apiTools: ToolDefinitionForApi[] = [
    ...buildSystemToolDefinitions(),
    ...hostTools.map(hostToolToApi),
  ];

  return {
    options,
    apiTools,
    async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      if (RESERVED_NAMES.has(name)) {
        return executeSystemTool(name, args, systemCtx);
      }
      const host = hostByName.get(name);
      if (!host) {
        throw new Error(`Unknown tool: ${name}`);
      }
      return host.execute(args);
    },
  };
}

function hostToolToApi(tool: HostToolDefinition): ToolDefinitionForApi {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

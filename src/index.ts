/**
 * bubble-harness — lightweight agent loop for constrained JavaScript runtimes.
 */

export const PACKAGE_NAME = 'bubble-harness';
export const PACKAGE_VERSION = '0.1.0-dev';

export function getVersion(): string {
  return PACKAGE_VERSION;
}

export { createHarness } from './harness.ts';
export { runAgentLoop } from './loop.ts';
export { createOpenRouterCallModel } from './openrouter.ts';
export { SYSTEM_TOOL_NAMES, buildSystemToolDefinitions } from './tools/schemas.ts';
export { isUrlAllowed } from './tools/system.ts';

export type {
  AgentStopReason,
  AssistantMessage,
  CallModelFn,
  CallModelRequest,
  CallModelResult,
  ChatMessage,
  FetchAllowlistEntry,
  FetchImpl,
  FetchRequest,
  FetchResponse,
  Harness,
  HarnessOptions,
  HostToolDefinition,
  JsonSchemaObject,
  KVStore,
  RunAgentLoopOptions,
  RunAgentLoopResult,
  SystemMessage,
  ToolCall,
  ToolDefinitionForApi,
  ToolMessage,
  UserMessage,
} from './types.ts';

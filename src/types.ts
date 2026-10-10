/** OpenAI-compatible chat message (OpenRouter). */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessageBase {
  role: ChatRole;
  content?: string | null;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AssistantMessage extends ChatMessageBase {
  role: 'assistant';
  content?: string | null;
  tool_calls?: ToolCall[];
}

export interface ToolMessage extends ChatMessageBase {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export interface SystemMessage extends ChatMessageBase {
  role: 'system';
}

export interface UserMessage extends ChatMessageBase {
  role: 'user';
}

export type ChatMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;

export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinitionForApi {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: JsonSchemaObject;
  };
}

export interface HostToolDefinition {
  name: string;
  description?: string;
  parameters: JsonSchemaObject;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface KVStore {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
}

export interface FetchRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResponse {
  status: number;
  body: string;
}

export type FetchImpl = (req: FetchRequest) => Promise<FetchResponse>;

export interface CallModelRequest {
  messages: ChatMessage[];
  tools: ToolDefinitionForApi[];
  temperature?: number;
  maxTokens?: number;
}

export interface CallModelResult {
  message: AssistantMessage;
  finishReason?: string | null;
}

export type CallModelFn = (req: CallModelRequest) => Promise<CallModelResult>;

export type FetchAllowlistEntry = string | RegExp;

export interface HarnessOptions {
  kvStore: KVStore;
  callModel: CallModelFn;
  fetchImpl?: FetchImpl;
  fetchAllowlist?: FetchAllowlistEntry[];
  hostTools?: HostToolDefinition[];
  maxSteps?: number;
  toolResultMaxBytes?: number;
}

export interface Harness {
  readonly options: Readonly<HarnessOptions>;
  readonly apiTools: ToolDefinitionForApi[];
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export type AgentStopReason = 'completed' | 'max_steps';

/**
 * Observability events for a single `runAgentLoop` invocation.
 * Default: no events. Host decides whether to log / redact / ignore payloads.
 * OpenRouter / host API keys are never fields on these events (they stay in
 * the host `callModel` closure).
 */
export type AgentLoopEvent =
  | {
      type: 'step';
      step: number;
      maxSteps: number;
      /** Messages about to be sent to `callModel` (shallow copy). */
      messages: ChatMessage[];
    }
  | {
      type: 'assistant';
      step: number;
      message: AssistantMessage;
    }
  | {
      type: 'tool';
      step: number;
      toolCall: ToolCall;
      message: ToolMessage;
    }
  | {
      type: 'done';
      steps: number;
      stopReason: AgentStopReason;
      messages: ChatMessage[];
    };

export type AgentLoopEventHandler = (
  event: AgentLoopEvent,
) => void | Promise<void>;

export interface RunAgentLoopOptions {
  messages: ChatMessage[];
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  /** Optional; omitted means silent. Library never writes to console. */
  onEvent?: AgentLoopEventHandler;
}

export interface RunAgentLoopResult {
  messages: ChatMessage[];
  steps: number;
  stopReason: AgentStopReason;
}

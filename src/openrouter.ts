import type { AssistantMessage, CallModelFn, ToolCall } from './types.ts';

export type OpenRouterFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface OpenRouterCallModelOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: OpenRouterFetch;
  referer?: string;
  title?: string;
}

interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: unknown;
      reasoning_content?: unknown;
      reasoning?: unknown;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

/**
 * Coerce OpenRouter / reasoning-route assistant payloads into a host-visible
 * string. Prefer `content` (string or content-part array); if empty, fall back
 * to `reasoning_content` / `reasoning`. Whitespace-only → null.
 */
export function normalizeOpenRouterMessageContent(raw: {
  content?: unknown;
  reasoning_content?: unknown;
  reasoning?: unknown;
}): string | null {
  const fromContent = coerceVisibleText(raw.content);
  if (fromContent !== null) {
    return fromContent;
  }
  return (
    coerceVisibleText(raw.reasoning_content) ?? coerceVisibleText(raw.reasoning)
  );
}

function coerceVisibleText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const parts: string[] = [];
  for (const part of value) {
    if (typeof part === 'string') {
      parts.push(part);
      continue;
    }
    if (typeof part !== 'object' || part === null) {
      continue;
    }
    const obj = part as Record<string, unknown>;
    if (typeof obj.text === 'string') {
      parts.push(obj.text);
    } else if (typeof obj.content === 'string') {
      parts.push(obj.content);
    }
  }
  const joined = parts.join('').trim();
  return joined.length > 0 ? joined : null;
}

/**
 * Builds a `CallModelFn`. The API key stays in this closure for the
 * Authorization header only — it is never returned, never placed on
 * `AgentLoopEvent`, and never included in thrown Error messages.
 */
export function createOpenRouterCallModel(options: OpenRouterCallModelOptions): CallModelFn {
  const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const fetchFn = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey;

  return async (req) => {
    const body = {
      model: options.model,
      messages: req.messages,
      tools: req.tools,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (options.referer) {
      headers['HTTP-Referer'] = options.referer;
    }
    if (options.title) {
      headers['X-Title'] = options.title;
    }

    const response = await fetchFn(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as OpenRouterChatCompletionResponse;
    if (!response.ok) {
      const msg = data.error?.message ?? `OpenRouter HTTP ${response.status}`;
      throw new Error(msg);
    }

    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new Error('OpenRouter response missing message');
    }

    const raw = choice.message;
    const tool_calls: ToolCall[] | undefined = raw.tool_calls?.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    const message: AssistantMessage = {
      role: 'assistant',
      content: normalizeOpenRouterMessageContent(raw),
      ...(tool_calls?.length ? { tool_calls } : {}),
    };

    return {
      message,
      finishReason: choice.finish_reason ?? null,
    };
  };
}

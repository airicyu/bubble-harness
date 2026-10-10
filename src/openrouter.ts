import type { AssistantMessage, CallModelFn, ToolCall } from './types.ts';

export interface OpenRouterCallModelOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  referer?: string;
  title?: string;
}

interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
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

export function createOpenRouterCallModel(options: OpenRouterCallModelOptions): CallModelFn {
  const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const fetchFn = options.fetchImpl ?? fetch;

  return async (req) => {
    const body = {
      model: options.model,
      messages: req.messages,
      tools: req.tools,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${options.apiKey}`,
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
      content: raw.content ?? null,
      ...(tool_calls?.length ? { tool_calls } : {}),
    };

    return {
      message,
      finishReason: choice.finish_reason ?? null,
    };
  };
}

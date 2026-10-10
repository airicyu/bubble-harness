import type {
  AgentLoopEvent,
  AssistantMessage,
  ChatMessage,
  Harness,
  RunAgentLoopOptions,
  RunAgentLoopResult,
  ToolCall,
  ToolMessage,
} from './types.ts';
import { stringifyToolResult, truncateUtf8 } from './truncate.ts';

export async function runAgentLoop(
  harness: Harness,
  loopOptions: RunAgentLoopOptions,
): Promise<RunAgentLoopResult> {
  const maxSteps = harness.options.maxSteps ?? 8;
  const toolResultMaxBytes = harness.options.toolResultMaxBytes ?? 8192;
  const onEvent = loopOptions.onEvent;
  const retryEmptyFinal = loopOptions.retryEmptyFinal === true;

  const messages: ChatMessage[] = [...loopOptions.messages];
  if (loopOptions.systemMessage) {
    messages.unshift({ role: 'system', content: loopOptions.systemMessage });
  }

  let steps = 0;
  let stopReason: RunAgentLoopResult['stopReason'] = 'max_steps';
  let emptyFinalRetried = false;

  while (steps < maxSteps) {
    steps += 1;
    await emit(onEvent, {
      type: 'step',
      step: steps,
      maxSteps,
      messages: [...messages],
    });

    const { message } = await harness.options.callModel({
      messages,
      tools: harness.apiTools,
      temperature: loopOptions.temperature,
      maxTokens: loopOptions.maxTokens,
    });

    const assistantMessage: AssistantMessage = {
      role: 'assistant',
      content: message.content ?? null,
      ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
    };
    messages.push(assistantMessage);
    await emit(onEvent, {
      type: 'assistant',
      step: steps,
      message: assistantMessage,
    });

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      if (!isBlankContent(assistantMessage.content)) {
        stopReason = 'completed';
        break;
      }

      if (retryEmptyFinal && !emptyFinalRetried) {
        emptyFinalRetried = true;
        const nudgeText = loopOptions.emptyFinalUserMessage?.trim();
        if (nudgeText) {
          const nudgeMessage = { role: 'user' as const, content: nudgeText };
          messages.push(nudgeMessage);
          await emit(onEvent, {
            type: 'nudge',
            step: steps,
            reason: 'empty_final',
            message: nudgeMessage,
          });
        }
        continue;
      }

      stopReason = 'empty_final';
      break;
    }

    for (const toolCall of toolCalls) {
      const toolMessage = await runSingleToolCall(
        harness,
        toolCall,
        toolResultMaxBytes,
      );
      messages.push(toolMessage);
      await emit(onEvent, {
        type: 'tool',
        step: steps,
        toolCall,
        message: toolMessage,
      });
    }
  }

  const finalText = extractFinalText(messages);
  const result: RunAgentLoopResult = { messages, steps, stopReason, finalText };
  await emit(onEvent, {
    type: 'done',
    steps,
    stopReason,
    finalText,
    messages: [...messages],
  });
  return result;
}

/** Last assistant content without `tool_calls` (trimmed); else "". */
export function extractFinalText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'assistant') {
      continue;
    }
    if (message.tool_calls?.length) {
      continue;
    }
    return (message.content ?? '').trim();
  }
  return '';
}

function isBlankContent(content: string | null | undefined): boolean {
  return (content ?? '').trim().length === 0;
}

async function emit(
  onEvent: RunAgentLoopOptions['onEvent'],
  event: AgentLoopEvent,
): Promise<void> {
  if (!onEvent) {
    return;
  }
  await onEvent(event);
}

async function runSingleToolCall(
  harness: Harness,
  toolCall: ToolCall,
  toolResultMaxBytes: number,
): Promise<ToolMessage> {
  const name = toolCall.function.name;
  let content: string;

  try {
    const args = parseToolArguments(toolCall.function.arguments);
    const result = await harness.executeTool(name, args);
    content = truncateUtf8(stringifyToolResult(result), toolResultMaxBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    content = truncateUtf8(
      JSON.stringify({ ok: false, error: message }),
      toolResultMaxBytes,
    );
  }

  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    content,
  };
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Arguments must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON arguments: ${detail}`);
  }
}

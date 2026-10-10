# 0.1.0 — HOW（實作契約）

← [INDEX.md](./INDEX.md)

## 公開入口

```ts
import {
  runAgentLoop,
  createHarness,
  createOpenRouterCallModel,
  SYSTEM_TOOL_NAMES,
} from 'bubble-harness'; // 解析至 src/index.ts
```

### `createHarness(options)`

| 欄位 | 必填 | 說明 |
|------|------|------|
| `kvStore` | 是 | `{ get(key), set(key, value) }`，可 async |
| `callModel` | 是 | 見下 |
| `fetchImpl` | 否 | 預設 `globalThis.fetch` |
| `fetchAllowlist` | 否 | 字串前綴或 `RegExp`；未設定則不檢查 |
| `hostTools` | 否 | 宿主工具陣列 |
| `maxSteps` | 否 | 預設 `8` |
| `toolResultMaxBytes` | 否 | 預設 `8192` |

### `callModel`

```ts
type CallModelFn = (req: {
  messages: ChatMessage[];
  tools: ToolDefinitionForApi[];
  temperature?: number;
  maxTokens?: number;
}) => Promise<{
  message: AssistantMessage;
  finishReason?: string | null;
}>;
```

Harness 每步呼叫一次；`message` 可含 `tool_calls`。無 `tool_calls` 時 loop 結束並回傳完整 `messages`。

### `runAgentLoop(harness, { messages, systemMessage?, temperature?, maxTokens? })`

- 若提供 `systemMessage`，prepend `role: 'system'`（不覆寫既有 system 訊息邏輯：僅在呼叫端傳入時加入）。
- 回傳 `{ messages, steps, stopReason }`；`stopReason`: `'completed' | 'max_steps'`.

## System tool 實作

- 名稱固定：`kv.get`, `kv.set`, `memory.get`, `memory.set`, `fetch`。
- LLM 看到的 `parameters` 為 JSON Schema object（OpenAI tools 格式）。

## Tool 執行與回傳給 LLM

1. Parse `tool_calls[].function.arguments`（JSON 字串）→ 失敗則 tool result = `{ ok: false, error: "Invalid JSON arguments: ..." }`。
2. 執行對應 handler；throw 或 reject → `{ ok: false, error: message }`。
3. 成功 → `JSON.stringify` 結果；若為 object 且無 `ok` 欄位，仍直接序列化（system `kv.set` 回 `{ ok: true }`）。
4. 字串化後 UTF-8 byte length > `toolResultMaxBytes` → 截斷並加 `\n...[truncated]`。

Tool message：`{ role: 'tool', tool_call_id, content: string }`。

## OpenRouter helper

`createOpenRouterCallModel({ apiKey, model, baseUrl?, fetch? })` 回傳 `CallModelFn`。  
POST `https://openrouter.ai/api/v1/chat/completions`（或 `baseUrl`）。  
**不在 harness 內讀環境變數**；example 可從 `Bun.env.OPENROUTER_API_KEY` 讀取後傳入。

## 禁止

- 在 `src/` 內 import `chrome` 或錢包專用模組。
- 將 API key 寫入 repo 或預設常數。

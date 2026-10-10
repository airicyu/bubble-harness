# 0.1.0 — Node 可跑的最小 agent loop

← [docs/roadmap/](../README.md)

**狀態：** `in progress`  
**版本：** 0.1.0（出貨前仍為 `0.1.0-dev` npm 標籤）  
**Changelog：** [倉庫根 changelog.md](../../../changelog.md)  
**設計共識來源：** [docs/brainstorm/harness-design-context.md](../../brainstorm/harness-design-context.md)（與本 INDEX 衝突時以 brainstorm 為準）

---

## 產品句

本版在 **Node 環境** 交付可執行的 **最小 agent 推理迴圈**：單一 messages 主線累積 assistant `tool_calls` 與 `role: tool` 結果；內建 system tools（`kv.get`／`kv.set`、`memory.get`／`memory.set`、`fetch`）；宿主可註冊額外 tools；LLM 經 **宿主注入的 `callModel`** 走 OpenRouter Chat Completions tool calling（**OpenRouter 不是 system tool**）。不含 Chrome sandbox 橋、不含錢包專用 tools。

> **覆寫舊稿：** 先前 INDEX 寫「不實作完整推理迴圈」已廢止；0.1.0 **應**實作最小 loop（見 brainstorm §已拍板 #9）。

---

## 文件地圖

| 檔案 | 用途 |
|------|------|
| [HOW.md](./HOW.md) | API 形狀、loop 行為、錯誤與截斷契約 |
| [HANDOFF.md](./HANDOFF.md) | 實作／審查交接與 paste-ready prompt |
| [reasoning.md](./reasoning.md) | 與 brainstorm 對齊的決策理由（簡） |
| [../../brainstorm/harness-design-context.md](../../brainstorm/harness-design-context.md) | 產品方向與已拍板清單 |

---

## 已定案

### 執行環境與範圍

- **先 Node 跑通**；Chrome extension sandbox 宿主適配延後。
- 本 package **不**呼叫 `chrome.*`、**不**接 vault、**不**內建 wallet tools（`decode_message`、`rpc_read` 等由 airwave-wallet 等宿主日後註冊）。

### System tools（對 LLM 暴露的名稱與 schema）

| Tool | 參數（JSON） | 回傳 |
|------|----------------|------|
| `kv.get` | `{ key: string }` | `string \| null` |
| `kv.set` | `{ key: string, value: string }` | `{ ok: true }` |
| `memory.get` | `{ key: string }` | `string \| null`（**session-scoped**，不持久） |
| `memory.set` | `{ key: string, value: string }` | `{ ok: true }` |
| `fetch` | `{ url, method?, headers?, body? }` | `{ status: number, body: string }`；可選 **URL allowlist**（宿主設定） |

KV 持久性由宿主注入的 `kvStore` 決定；`memory` 僅存在單次 `runAgentLoop`／session 生命週期內。

### LLM（機制，非 tool）

- OpenRouter **Chat Completions** + **tool calling**：每輪請求帶 `tools`；assistant 回 `tool_calls`（`arguments` 為 JSON 字串）；tool 結果以 `role: "tool"`、`tool_call_id` 回寫同一條 messages 主線。
- Harness **不持有** OpenRouter API key。宿主提供 `callModel({ messages, tools, temperature?, maxTokens? }) => Promise<{ message, finishReason? }>`。
- 可選匯出 `createOpenRouterCallModel({ apiKey, baseUrl?, model, fetch? })` 供 Node 宿主使用；key 由呼叫端傳入，不寫入 harness。

### 宿主註冊 tools

- `registerHostTool({ name, description?, parameters, execute })` 或等價的 `hostTools` 陣列；名稱不可與 system tools 衝突。
- `execute` 接收已 parse 的 JSON 參數物件；由 harness 在 loop 內呼叫。

### Loop 行為

- 預設 **`maxSteps = 8`**（一步 = 一次 `callModel`；若 assistant 無 `tool_calls` 則結束）。
- 單次 tool 結果字串化後若超過 **≈8192 bytes（UTF-8）**，截斷並附加標記 `[truncated]`（或等價固定後綴，見 HOW）。
- Tool 執行失敗：**不 throw 終止 loop**；對 LLM 回傳 JSON 字串 `{ "ok": false, "error": "<message>" }`（`ok: true` 時為正常 payload）。
- 無效 JSON arguments：同樣走 structured error，不 crash loop。

### 公開 API（TypeScript）

- `dist/index.d.ts` 匯出：`runAgentLoop`、`createHarness`（或等價）、system tool schema 建構、`createOpenRouterCallModel`、相關 message／tool 型別。
- `getVersion()` 保留；`PACKAGE_VERSION` 出貨前可改為 `0.1.0`。

### 範例

- `examples/minimal-node/`：註冊假宿主 tool、mock LLM 或 `OPENROUTER_API_KEY` 跑短 loop；README 說明執行方式。

### KV／memory 介面形狀（原待拍板）

- `kvStore.get(key) => string | null`；`kvStore.set(key, value) => void | Promise<void>`（同步／async 皆可）。
- Session memory： harness 內部 `Map`，不暴露持久化。

### callModel 選項（原待拍板）

- 至少 `messages` + `tools`；`temperature`、`maxTokens` 可選，透傳給宿主／OpenRouter helper。

### 錯誤契約（原待拍板）

- Tool 層：**structured `{ ok: false, error }`**，見上。

---

## 非目標（本版不做）

- Chrome sandbox 與 extension 訊息橋
- airwave-wallet 整合與真實 Solana RPC tools
- MCP client、filesystem、shell、stdio MCP
- 完整測試 runner 生態（僅 npm scripts 驗收；可選少量 `node --test`）
- 簽名／私鑰／vault

---

## 開工前仍須拍板

（無 — 上述已定案涵蓋 brainstorm §已拍板；細節見 HOW。）

---

## 實作軌道（Track）

### Track A — 型別與 system tools

- **做：** message／tool 型別；KV 注入；session memory；`fetch` + allowlist；JSON schema 供 `callModel`。
- **不做：** OpenRouter 內建為 tool。
- **驗收：** typecheck 通過；system tools 可被 mock `callModel` 觸發。

### Track B — Loop 與截斷／錯誤

- **做：** `runAgentLoop`；maxSteps；tool result 截斷；structured tool errors。
- **驗收：** 單元或 example 展示多步 tool 與失敗不崩潰。

### Track C — OpenRouter helper 與 example

- **做：** `createOpenRouterCallModel`；`examples/minimal-node`。
- **驗收：** `npm run build`；example 在無 key 時用 mock 可跑。

---

## 驗收

- [x] `npm install` 成功
- [x] `npm run build` 產生 `dist/`
- [x] `npm run typecheck` 通過
- [x] `runAgentLoop` 可跑最小多輪 tool calling（mock 或 live OpenRouter）
- [x] System tools + 宿主註冊 tool 皆可在 loop 中被呼叫
- [x] `examples/minimal-node` 可執行（文件說明 `OPENROUTER_API_KEY`）
- [x] `dist/index.d.ts` 公開 API 與 HOW 一致

**手驗：**

```bash
npm run build && npm run typecheck
node examples/minimal-node/run.mjs
# 選用：OPENROUTER_API_KEY=... node examples/minimal-node/run.mjs --live
```

---

## 錨點檔案

- `src/index.ts` — 公開匯出
- `src/loop.ts` — agent loop
- `src/tools/` — system tools 與 registry
- `src/openrouter.ts` — 可選 OpenRouter `callModel` 工廠
- `examples/minimal-node/` — Node 範例
- `package.json` / `tsconfig.json`

---

## 與上一版對照

初始功能版本：由 scaffold（僅 `getVersion`）升級為 **可執行最小 loop**。

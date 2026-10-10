# bubble-harness 設計共識（brainstorm）

> 方向文件，**不是** 0.1.0 契約。排進 INDEX 前可改。  
> 對談對齊：2026-10-07～2026-10-10（Airwave Wallet PM ↔ Eric）

## Why

Airwave Wallet 簽名前要風險解讀。POC／0.28.0 路線是「確定性 flags → 一次 LLM 報告」：模型不能再查鏈，缺資料只能標未知。

需要獨立、可嵌入受限 JS 環境的瘦 agent harness：內層多輪 tool loop；不碰 vault／不代簽。

對外（end user）暫時一輪報告；內層多輪 tool。

## What

- 獨立 JS library（以 Bun 開發）；錢包是第一個宿主，但不綁死。
- Query-only；無簽名／私鑰／auto-approve。
- 瘦 sandbox（無 chrome.*）；宿主注入窄介面。
- 與 wallet flags 快路徑並行。

## How

### System tools

| Tool | Schema（草） |
|------|----------------|
| kv.get | `{ key: string }` → `string \| null` |
| kv.set | `{ key: string, value: string }` → `{ ok: true }` |
| memory.get/set | 同 kv；**一定** session-scoped |
| fetch | `{ url, method?, headers?, body? }` → `{ status, body }`（allowlist） |

KV 是否持久由宿主決定；memory 不持久。

### LLM（不是 tool）

OpenRouter Chat Completions tool calling：`tools` + assistant `tool_calls`（`arguments` 為 JSON 字串）+ `role:tool`；每輪帶 tools。Key 由宿主代打。

### Host register

宿主註冊 name + bound function + JSON Schema。Sandbox 只能經綁定介面呼叫。

Airwave 預想（由 wallet 實作，不在 harness 0.1.0）：decode_message、rpc_read、simulate、token_meta。

rpc_read 候選 allowlist：getBalance、getMultipleAccounts、getAccountInfo、getTokenAccountsByOwner、getSignaturesForAddress、getTransaction、simulateTransaction、getLatestBlockhash。

### Session / loop

宿主建毀 sessionId。同一條 messages 主線累積 tool 結果（對齊 OpenRouter／pi）；非 fork-summary。

預設 maxSteps=8；單次 tool result ≈8KB 截斷並標記。

### Wallet 觸發

簽名前自動跑深入分析，**不擋**既有模擬與批准。

## 已拍板（給 0.1.0）

1. Bun 先跑通 loop；Chrome sandbox 橋延後。  
2. System tools = kv + memory + fetch；OpenRouter 是 LLM 機制。  
3. Host register tools。  
4. OpenRouter tool calling 如上。  
5. maxSteps=8、≈8KB 截斷。  
6. 錯誤：工具失敗回傳結構化 error（勿裸 throw 弄死 loop）— 建議 `{ ok:false, error }`。  
7. callModel：至少 messages + tools；temperature／maxTokens 可選。  
8. examples/：建議最小 Bun 範例（直接跑 TypeScript）。  
9. 本版**要實作**最小 loop（非僅 stub）；舊 INDEX「不做完整 loop」以本檔為準覆寫。

## 延後

- Chrome sandbox 宿主適配  
- Wallet 正式 tools 實作  
- 延遲／成本實測  

## 相關

- https://github.com/airicyu/bubble-harness  
- airwave-wallet test-web sign-risk.html POC  

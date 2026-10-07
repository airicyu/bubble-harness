# 領域用語（bubble-harness）

← [GUIDELINES.md](./GUIDELINES.md) · [agent-workflow.md](./agent-workflow.md)

本檔定義 bubble-harness 專案跨版本的領域詞彙。與某版 INDEX 衝突時以 **該版 INDEX** 為準，並應回寫本檔說明分歧。

---

## Harness

**Agent harness**：執行 agent 推理迴圈的輕量框架。  
本專案的 harness 設計用於 **受限 JavaScript 環境**（例如 Chrome extension manifest sandbox），因此：

- 不依賴 Node.js 專屬 API（filesystem、child_process、stdio）
- 工具限四類（見下）
- 不直接呼叫平台 API（如 `chrome.storage`），改由 host 注入介面

---

## Loop（推理迴圈）

Agent 的執行週期：

1. 組裝 prompt（system + user + context）
2. 呼叫 model（例如經 OpenRouter）
3. 解析 model 回應（tool call 或 final answer）
4. 若為 tool call，執行工具並回到步驟 2
5. 完成或達停止條件

採用 **pi-agent 風格**：簡單、透明、少抽象層。

---

## Tools（工具）

Harness 提供給 model 的能力。**僅限四類**（本專案定位）：

1. **Key-value store interface**：讀寫具名資料塊（由 host 注入實作；harness 不直摸平台儲存）
2. **Temporary in-memory variables**：單次執行內的暫存變數（不持久）
3. **Web fetch**：HTTP(S) 請求（例如查詢 API、抓網頁）
4. **Model call via OpenRouter**：呼叫 LLM（經 OpenRouter HTTP API）

**非工具**（明確排除）：

- Filesystem（read/write files）
- Shell／child_process
- Stdio MCP
- 任意平台 API（如 `chrome.*`）

---

## KV Store（Key-Value Store）

具名資料塊儲存介面，由 **host 注入** harness。

- Harness **不直接**呼叫 `chrome.storage`、`localStorage` 或其他平台 API
- Host bridge 提供實作（例如將 `agent.*` 命名空間的 KV 映射到 `chrome.storage`）
- Agent 只能讀寫 host 允許的命名空間（例如 `agent.session.*`、`agent.context.*`）

職責分界：

- **Harness**：提供 `kvStore.read(key)` / `kvStore.write(key, value)` 介面給 agent tool
- **Host**：決定底層用什麼儲存、隔離命名空間、拒絕讀寫 vault 相關 key

---

## Memory Variables（記憶體變數）

執行期間的 **暫存變數**：

- 只活在單次 agent 執行內（例如一次 popout 解讀任務）
- 不寫入 KV store、不持久
- 適合暫存中間結果、本輪對話狀態

---

## OpenRouter

**OpenRouter**：統一 LLM API gateway，提供 HTTP 介面呼叫多家模型。

Harness 經 OpenRouter 呼叫 model：

- API key **由 host 持有並代打**（不進 sandbox）
- Harness 發出 tool-level 的 `callModel(messages)` 請求
- Host bridge 填入 key、轉發到 OpenRouter、回傳結果

---

## Host Bridge

**Host**：執行 harness 的應用程式（例如 airwave-wallet 的 service worker 或 offscreen document）。

**Bridge**：Host 與 sandbox 間的安全介面：

- Sandbox 內 harness 只能呼叫 host 允許的工具
- Host 代打需 secret 的操作（OpenRouter、寫入 `agent.*` KV）
- Host 確保 harness 無法讀寫 vault、密碼、私鑰

職責範例：

| 層 | 負責 |
|----|------|
| Harness（sandbox） | Agent loop、tool 呼叫抽象 |
| Host bridge | 實作 KV store、代打 OpenRouter、拒絕非法請求 |
| Host core | 持有 vault、處理簽名、決定 RPC |

---

## Sandbox

**Manifest sandbox**（Chrome extension manifest V3）：

- `manifest.json` 的 `sandbox.pages` 宣告的頁面
- **無** `chrome.*` API 存取權
- 適合執行不信任或需隔離的程式碼

Airwave-wallet 計畫將 harness 跑在 sandbox，以確保 agent 程式碼即使有供應鏈攻擊也無法讀 vault。

---

## Query-only Agent

**Query-only**：只提供查詢／解讀服務，**不**持鑰、不代簽、不改 vault。

例如：

- 解讀交易內容（輸入 tx bytes，輸出自然語言說明）
- 解釋 smart contract（輸入 program ID，輸出功能摘要）
- 回答使用者問題（基於公開鏈上資料）

**禁止**：

- 代使用者批准交易
- 讀取或解密私鑰
- 改動錢包設定

---

## Airwave-wallet 關係

**Airwave-wallet**：Solana Chrome extension 錢包（bubble-harness 的預期消費方）。

三步關係：

1. Airwave-wallet 先做成可用錢包（獨立於 harness）
2. bubble-harness 做成獨立 library（可在受限環境跑）
3. Airwave-wallet 引入 harness 並在 sandbox 內執行（提供 query-only agent 功能）

**Bubble-harness 不依賴 airwave-wallet**；可被其他專案消費。

---

## 與 airwave-wallet DOMAIN 的差異

本專案是 **library**，不是 extension；沒有 popup、service worker、inject、content script、Wallet Standard 等錢包特定概念。

若某版需對接錢包術語（例如「pending 請求」），應在該版 INDEX 或 `docs/integration.md` 寫清，不假設讀者讀過 airwave-wallet roadmap。

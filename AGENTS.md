# Agent 規則（bubble-harness）

本檔規範與 bubble-harness 專案協作的 AI agent 應遵守的原則。

## 語言

**對使用者溝通：繁體中文書面語**（可混用英文專有名詞，例如 agent、harness、KV store、OpenRouter）。

程式碼、commit 訊息、API 文件可使用英文，但使用者導向的文件（README、roadmap INDEX、AGENTS.md）以繁體中文為主。

## Roadmap 工作流

本專案採用與 airwave-wallet 相同的版本化 roadmap 開發節奏，不在對話中發明範圍：

1. **文件必須自足**：roadmap 是跨 agent 交接文件；新 agent 只靠檔案即可開工，不依賴聊天記錄
2. **設計審查閘門**：中型以上變更應先經設計審查（新 agent）→ 收斂已定案 → 再實作
3. **Track 節奏**：依 INDEX 與 HANDOFF 定義的 Track 順序逐步實作與驗收
4. **實作審查**：碼完成後由新 agent 審查 → 修洞 → 複審通過才視為可出貨
5. **Do not commit unless user asks**（特別是 roadmap 的設計／實作審查 agent）

詳細規範：

- [docs/roadmap/GUIDELINES.md](docs/roadmap/GUIDELINES.md)：如何寫自足的 roadmap、架構禁區
- [docs/roadmap/agent-workflow.md](docs/roadmap/agent-workflow.md)：誰審查、何時 HANDOFF、何時測試

## 架構與範圍約束

bubble-harness 是 **library**，不是完整應用程式。與 airwave-wallet（Chrome extension 錢包）的差異：

| 本專案 | airwave-wallet |
|--------|----------------|
| 純 JavaScript library | Chrome extension（多 runtime） |
| 不持有私鑰／vault | 擴充 core 持鑰 |
| 工具限四類（KV、memory、fetch、OpenRouter） | 完整錢包功能 |
| 設計上可在 sandbox 執行 | 須處理 manifest V3、chrome.storage、pending 流程 |

**禁止假設**：

- 開發與測試只用 **Bun**（`bun install` / `bun test` / 直接跑 `.ts`）
- 不假設 filesystem、child_process、shell；函式庫源碼只用 Web 標準 API
- 不假設 host 會提供 vault / 密碼 / 私鑰給 harness
- 不假設 harness 能直接呼叫 `chrome.storage` 或 extension API

Host（例如 airwave-wallet）負責注入 KV store 實作並在隔離環境中執行 harness。

## 隱私與安全

Roadmap 文件、範例程式、測試案例 **禁止**包含：

- 真實的 API keys（例如 OpenRouter key）
- 真實的私鑰、助記詞、密碼
- 個人地址或交易紀錄

範例應使用虛構資料並明確標注為測試向量。

## 非目標（明確排除）

設計討論或提案不應涉及：

- 桌面級 agent 框架功能（LangChain、AutoGPT 等的完整能力）
- Filesystem / shell / stdio MCP 工具（與受限環境定位衝突）
- Agent 持有或解密私鑰（安全責任屬於 host）
- 多模態、語音、影像生成（超出 query-only 輕量定位）

## 現狀

本專案目前為 0.1.0-dev：最小 agent loop 已可在 Bun 執行。

- 開發／測試／範例只用 Bun，入口為 `src/index.ts`（無 `dist/`）
- Chrome sandbox 宿主適配仍延後

Agent 在開工前應確認：

- 該版本 INDEX 是否已自足（開工前仍須拍板為空或僅非目標）
- 是否需要 design-review（中型以上變更建議做）
- HANDOFF 是否已寫好 paste-ready starter prompt

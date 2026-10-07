# bubble-harness

**輕量級 agent harness，為受限的 JavaScript 執行環境設計。**

bubble-harness 是一個簡潔的 agent 執行框架，專為無法存取檔案系統、shell 或 stdio MCP 的 JavaScript 環境（例如 Chrome extension sandbox）設計。它採用 pi-agent 風格的簡單迴圈，提供最小但足夠的工具介面。

## 非目標

- **不是**完整的桌面級 agent 框架
- **不提供** filesystem / shell / stdio MCP 工具
- **不持有**私鑰或密碼
- **不依賴** Node.js 特定 API（設計上可在瀏覽器執行環境運行）

## 計畫中的工具介面

Harness 將支援以下四類工具：

1. **Key-value store interface**：由 host 注入的儲存介面操作
2. **Temporary in-memory variables**：執行期間的暫存變數
3. **Web fetch**：HTTP(S) 請求
4. **Model calls via OpenRouter**：經由 OpenRouter HTTP API 呼叫模型

## 消費方式

bubble-harness 設計為 npm library，供其他專案（例如 airwave-wallet）作為依賴項安裝：

```bash
npm install bubble-harness
```

Host 應用程式負責：
- 注入 KV store 實作
- 在隔離環境（例如 manifest sandbox）中初始化 harness
- 確保 harness 無法存取應用程式的 vault 或敏感 API

## Roadmap 與開發節奏

本專案遵循 [docs/roadmap/](docs/roadmap/) 定義的版本化開發流程。實作前請閱讀：

- [docs/roadmap/GUIDELINES.md](docs/roadmap/GUIDELINES.md)：文件自足原則、架構禁區
- [docs/roadmap/agent-workflow.md](docs/roadmap/agent-workflow.md)：設計審查、Track 實作、驗收流程
- Agent 規則見倉庫根 [AGENTS.md](AGENTS.md)

構想與待辦項目見 [docs/roadmap/backlog/INDEX.md](docs/roadmap/backlog/INDEX.md)。

## 版本與變更記錄

- **當前版本**：0.1.0-dev（開發中）
- 版本詳情：[version.md](version.md)
- 變更記錄：[changelog.md](changelog.md)

## 授權

Apache-2.0 License  
Copyright 2026 Airic Yu

完整授權條款見 [LICENSE](LICENSE)。

## 相關專案

- **airwave-wallet**：Solana Chrome 擴充錢包，計畫將 bubble-harness 嵌入隔離環境執行 query-only agent 服務

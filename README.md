# bubble-harness

**輕量級 agent harness，為受限的 JavaScript 執行環境設計。**

bubble-harness 是一個簡潔的 agent 執行框架，專為無法存取檔案系統、shell 或 stdio MCP 的 JavaScript 環境（例如 Chrome extension sandbox）設計。它採用 pi-agent 風格的簡單迴圈，提供最小但足夠的工具介面。

本倉庫 **只用 Bun**：套件管理、測試、範例皆直接跑 TypeScript 源碼，也不使用 npm／Node CLI。開發與測試以 `src/` 為準；若要嵌進其他專案或 sandbox，可選打成單檔 ESM。

## 非目標

- **不是**完整的桌面級 agent 框架
- **不提供** filesystem / shell / stdio MCP 工具
- **不持有**私鑰或密碼
- **不依賴** Node 專屬 API（`fs`、`child_process` 等）；runtime 只用 Web 標準（例如 `fetch`）

## 工具介面

1. **Key-value store**：由 host 注入
2. **Temporary in-memory variables**：單次執行暫存
3. **Web fetch**：HTTP(S) 請求
4. **Model calls via OpenRouter**：由宿主注入的 `callModel`（可選 `createOpenRouterCallModel`）

## 開發

```bash
bun install
bun run typecheck
bun test
bun run example
bun run build   # 可選：產出 dist/bubble-harness.js
```

其他專案安裝：

```bash
bun add bubble-harness
```

套件入口為 `src/index.ts`。Host 負責注入 KV store、在隔離環境初始化 harness，並確保 harness 無法存取 vault。

### 單檔 bundle（可選）

```bash
bun run build
```

產出 `dist/bubble-harness.js`（ESM、`--target=browser`，約 21 KB，gitignored）。可直接 copy 到其他專案：

```js
import { createHarness, runAgentLoop } from './vendor/bubble-harness.js';
```

型別仍以本倉庫 `src/index.ts` 為準；單檔本身不含 `.d.ts`。

## Roadmap 與開發節奏

- [docs/roadmap/GUIDELINES.md](docs/roadmap/GUIDELINES.md)
- [docs/roadmap/agent-workflow.md](docs/roadmap/agent-workflow.md)
- [AGENTS.md](AGENTS.md)
- [docs/roadmap/backlog/INDEX.md](docs/roadmap/backlog/INDEX.md)

## 版本與變更記錄

- **當前版本**：0.2.0
- [version.md](version.md)
- [changelog.md](changelog.md)

## 授權

Apache-2.0 License  
Copyright 2026 Airic Yu

完整授權條款見 [LICENSE](LICENSE)。

## 相關專案

- **airwave-wallet**：Solana Chrome 擴充錢包，計畫將 bubble-harness 嵌入隔離環境執行 query-only agent 服務

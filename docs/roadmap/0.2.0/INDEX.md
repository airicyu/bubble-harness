# 0.2.0 — Sandbox 邊界（library 提供）

← [docs/roadmap/](../README.md)

**狀態：** `shipped`  
**版本：** 0.2.0  
**Changelog：** [倉庫根 changelog.md](../../../changelog.md)  
**上一版：** [0.1.0](../0.1.0/INDEX.md)

---

## 產品句

本版由 **bubble-harness 自己** 提供 sandbox 邊界：隔離端（guest）跑既有 `runAgentLoop`；有權限的一端（host）持有 `kvStore`、`callModel`、`fetch` 實作與 host tool 的 `execute`。兩邊只經 **JSON port** 往返。函式庫不呼叫 `chrome.*`，不內建錢包 tools。0.1.0 的同進程 `createHarness` 行為不變。

---

## 文件地圖

| 檔案 | 用途 |
|------|------|
| [HOW.md](./HOW.md) | Port、訊息、guest／host API、錯誤契約 |
| [reasoning.md](./reasoning.md) | 為何 guest 跑 loop、為何 JSON、為何本版無 session 協定 |
| [HANDOFF.md](./HANDOFF.md) | 實作交接（設計閘門通過後使用） |

---

## 已定案

### 邊界

- **Guest** 建立 `Harness` 並呼叫 `runAgentLoop`。Session **memory** 只存在該 guest harness 實例內，不跨 port。
- **Host** 執行 `kv.get`／`kv.set`、`fetch`、`callModel`，以及宿主註冊 tool 的 `execute`。OpenRouter API key 只出現在 host 的 `callModel` 閉包裡，不進入 port payload。
- 一個配對的 port 就是一條 sandbox 連線。本版 **沒有** 獨立 `sessionId` 欄位；宿主若要持久化 messages，在 guest 的 `runAgentLoop` 回傳後自行保存。
- `fetch` allowlist 在 **guest** 檢查（沿用 0.1.0 `executeSystemTool`）。不允許的 URL 不送出 port。
- Host tool 的 **JSON Schema** 在 guest 註冊，讓模型看得到名稱與參數；**`execute` 只在 host**。

### Port

- `SandboxPort`：`postMessage(data: unknown): void` 與 `onMessage(handler): () => void`（回傳值用來解除訂閱）。
- 送上 port 的業務訊息必須是 JSON 物件。實作在處理前做 `JSON.parse(JSON.stringify(data))`；函式、`RegExp`、類別實例不得作為契約的一部分。
- `kind` 不符的訊息忽略，不回應。
- Host 的 `close()` 先送一筆 `{ kind: 'bubble-harness.sandbox.close' }`，再解除 host 訂閱。Guest 收到後拒絕所有尚未完成的請求（`Error('Sandbox port closed')`），並解除 guest 訂閱。這筆關閉訊息是 JSON，分離進程不需共享記憶體。

### 公開 API

- `createSandboxGuest(port, options) => Harness`。`options` 含可選 `fetchAllowlist`、`maxSteps`、`toolResultMaxBytes`、`hostToolSchemas`（`name`、`description?`、`parameters`，無 `execute`）。
- `createSandboxHost(port, handlers) => { close(): void }`。`handlers` 必填 `kvStore`、`callModel`；可選 `fetchImpl`、`hostTools`（含 `execute`）。`close()` 的跨端效果只靠上一節的 `bubble-harness.sandbox.close` 訊息。
- `createInProcessSandboxPorts() => { host: SandboxPort, guest: SandboxPort }`，供 Bun 測試把兩端接在同一進程。正式宿主可自行把 `postMessage` 接到 iframe 或 `MessageChannel`；該接線 **不** 在本版實作。

### 錯誤

- Tool 路徑（kv／fetch／hostTool）失敗：host 回 `{ ok: false, error }`；guest 端 proxy **throw** `Error(error)`，讓 0.1.0 loop 寫成 `{ "ok": false, "error" }`，不終止 loop。
- `callModel` 失敗：guest 的 `callModel` **reject**，與 0.1.0 直接注入的 `callModel` 拋錯相同（loop 不吞掉模型錯誤）。
- 本版 **不** 做請求逾時。Host 不回應則對應的 guest await 一直掛著。

---

## 非目標（本版不做）

- Chrome extension、`chrome.*`、iframe HTML、manifest
- airwave-wallet tools（`decode_message`、`rpc_read` 等）
- 跨連線的 session 協定、messages 持久化 API
- 請求逾時、取消令牌、重試
- MCP、filesystem、shell
- 簽名、vault、私鑰
- 改變 0.1.0 `createHarness`／`runAgentLoop` 的既有語意

---

## 開工前仍須拍板

（無）

---

## 實作軌道（Track）

### Track A — Port 與進程內配對

- **做：** `SandboxPort` 型別、請求／回應訊息型別、`createInProcessSandboxPorts`。
- **不做：** guest harness、host 業務分派。
- **驗收：** `bun test` 中一則測試證明 guest `postMessage` 能被 host `onMessage` 收到，且解除訂閱後不再收到。

### Track B — Host 分派

- **做：** `createSandboxHost` 依 `op` 呼叫 handlers，並以 `id` 回覆。
- **不做：** 改 loop。
- **驗收：** 測試以假 `kvStore`、假 `callModel`、假 host tool 證明成功與 `{ ok: false, error }` 都回到 guest port。

### Track C — Guest harness

- **做：** `createSandboxGuest` 回傳可用的 `Harness`；`runAgentLoop` 可跑完一輪 tool（含 memory 留在 guest、allowlist 擋下不送 port）。
- **驗收：** `bun test` 覆蓋：kv 經 host、memory 不經 host、allowlist 拒絕、host tool `execute` 只在 host、`callModel` 失敗時 promise reject、guest 收到 `bubble-harness.sandbox.close` 後拒絕未完成請求。`bun run typecheck` 通過。

---

## 驗收

- [x] `bun run typecheck` 通過
- [x] `bun test` 通過（含既有 loop 測試，證明同進程 API 未壞）
- [x] Guest 經 port 完成至少一次 `kv` 與一次 host tool
- [x] `fetch` allowlist 拒絕時，host 的 `fetchImpl` 未被呼叫
- [x] Host `callModel` throw 時，guest 的 `runAgentLoop` promise reject
- [x] Guest 收到 `bubble-harness.sandbox.close` 時，未完成請求 reject，且不依賴與 host 共享的記憶體
- [x] `src/index.ts` 匯出 `createSandboxGuest`、`createSandboxHost`、`createInProcessSandboxPorts` 與 HOW 的型別
- [x] `src/` 無 `chrome` import

**手驗：**

```bash
bun run typecheck
bun test
```

---

## 錨點檔案

- `src/index.ts` — 公開匯出
- `src/harness.ts` — 既有 `createHarness`（guest 應重用，不複製 loop）
- `src/loop.ts` — 既有 loop（本版不改語意）
- `src/sandbox.ts` — port、host、guest（本版新增）
- `test/` — `bun test` 案例

---

## 與上一版對照

0.1.0 假設 `kvStore`、`callModel`、`fetchImpl`、host tool `execute` 與 loop 在同一進程。0.2.0 保留該路徑，並另提供把這四項有權限呼叫隔到 host、loop 留在 guest 的 JSON port。

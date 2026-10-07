# 0.1.0 — Minimal harness loop + 四類工具介面

← [docs/roadmap/](../README.md)

**狀態：** `planned`  
**版本：** 0.1.0  
**Changelog：** [倉庫根 changelog.md](../../../changelog.md)

---

## 產品句

本版建立最小 agent harness 執行骨架，定義四類工具介面（KV store、memory variables、fetch、OpenRouter model call），**但不實作完整推理迴圈**。目標是讓後續版本有清楚的 API 形狀可依循。

---

## 文件地圖

（本版尚無 `docs/` 或 `HANDOFF.md`；待與使用者討論 API 形狀後補充）

---

## 已定案

### 工具限四類

Harness 只提供四類工具：

1. **Key-value store interface**：`kvStore.read(key)` / `kvStore.write(key, value)` — 由 host 注入實作
2. **Temporary in-memory variables**：`memoryVars.get(name)` / `memoryVars.set(name, value)` — 不持久
3. **Web fetch**：`fetch(url, options)` — HTTP(S) 請求
4. **Model call via OpenRouter**：`callModel(messages, options)` — 由 host bridge 代打（API key 不進 harness）

**禁止**提供：filesystem、shell、arbitrary MCP stdio 工具。

### KV store 由 host 注入

Harness **不直接**呼叫 `chrome.storage`、`localStorage` 等平台 API。Host 初始化 harness 時傳入 KV store 實作（例如只允許讀寫 `agent.*` 命名空間）。

### OpenRouter key 由 host 持有

Harness 不持有 OpenRouter API key。`callModel` 工具發出請求後，host bridge 填入 key 並轉發。

---

## 非目標（本版不做）

- 完整 agent loop 實作（prompt 組裝、tool call 解析、迴圈控制）
- MCP client（日後可能加入；本版不做）
- 具體 host integration（例如與 airwave-wallet 的連接契約；留給消費方專案）
- UI／CLI（本專案是 library）
- 測試 runner 引入（尚未選定；某版引入時須回寫 GUIDELINES「出貨檔案」表）

---

## 開工前仍須拍板

以下題目尚未定案，**不應開始實作**：

- [ ] **Tool 介面形狀**：`kvStore.read(key)` 回傳 `{ value, exists }` 還是直接 `value | null`？
- [ ] **Memory variables API**：`Map` 或包裝物件？
- [ ] **callModel 參數**：是否需 `temperature`、`maxTokens` 等選項？
- [ ] **錯誤處理契約**：工具失敗時 throw 或回傳 `{ error }`？
- [ ] **TypeScript types 輸出**：`dist/index.d.ts` 的 public API 型別定義
- [ ] **最小範例**：需不需要 `examples/` 目錄與使用範例？

---

## 實作軌道（Track）

（待拍板清空後補充）

---

## 驗收

- [ ] `npm install` 成功
- [ ] `npm run build` 成功產生 `dist/` 輸出
- [ ] `npm run typecheck` 通過
- [ ] `src/index.ts` 輸出至少包含四類工具的 **介面定義或佔位 stub**（尚不需完整實作）
- [ ] `dist/index.d.ts` 存在且型別正確

**本版測試或手驗：**  
尚無整包測試指令；驗收以上述 npm scripts 通過為準。

---

## 錨點檔案

（待補充實作細節後更新）

- `src/index.ts`：Package 主要輸出
- `tsconfig.json`：TypeScript 編譯設定
- `package.json`：版本號、scripts、輸出設定

---

## 與上一版對照

本版是 **初始版本**（0.1.0），無上游版本對照。

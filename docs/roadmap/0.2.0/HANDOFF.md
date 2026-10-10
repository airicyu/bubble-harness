# 0.2.0 — HANDOFF

← [INDEX.md](./INDEX.md)

設計閘門通過後才依本檔實作。審查未通過時，以 INDEX 為準，不要提前寫產品碼。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [HOW.md](./HOW.md)
3. [reasoning.md](./reasoning.md)
4. [../0.1.0/HOW.md](../0.1.0/HOW.md)（不可改語意的 loop／tool 契約）
5. 倉庫根 [AGENTS.md](../../../AGENTS.md)

## 產品摘要

`createSandboxGuest` 在隔離端重用 `createHarness`／`runAgentLoop`。`createSandboxHost` 在有權限端執行 kv、fetch、`callModel`、host tool `execute`。往返只走 JSON port，含 `bubble-harness.sandbox.close`。

## Track 順序

A → B → C（見 INDEX）

## 禁區

`chrome.*`、iframe／manifest、wallet tools、session 協定、逾時、改 0.1.0 loop 的 stopReason／截斷／structured error。Allowlist 只留在 guest 既有檢查，不要加第二套 host allowlist 契約。

## 錨點

- 新增 `src/sandbox.ts`
- 匯出從 `src/index.ts`
- 測試放 `test/`，用 `bun test`

## 完成檢查

- INDEX 驗收全勾
- `bun run typecheck`
- `bun test`

---

## Paste-ready starter prompt

```
你是 bubble-harness 0.2.0 實作 agent。只認檔案，不認 chat history。

先讀：
1. 倉庫根 AGENTS.md
2. docs/roadmap/GUIDELINES.md
3. docs/roadmap/0.2.0/HANDOFF.md（本檔）
4. docs/roadmap/0.2.0/INDEX.md、HOW.md、reasoning.md
5. docs/roadmap/0.1.0/HOW.md

跟 Track 順序 A → B → C；禁非目標。INDEX 已定案不要再問。

每個 Track 結束跑該 Track 驗收；全部結束跑 bun run typecheck 與 bun test。

對使用者語言：繁體中文書面語。

Do not commit unless the user asks.
```

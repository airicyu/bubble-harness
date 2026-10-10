# Changelog

bubble-harness 的變更記錄。

---

## [0.2.0] - 2026-10-10

Sandbox 邊界：`createSandboxGuest`／`createSandboxHost`／`createInProcessSandboxPorts`。Guest 跑既有 loop；kv、fetch、`callModel`、host tool `execute` 經 JSON port 由 host 執行。

## [0.1.0] - 2026-10-10

最小 agent loop：`runAgentLoop`、`kv`／`memory`／`fetch`、宿主註冊 tools、可選 `createOpenRouterCallModel`。開發工具鏈為純 Bun（入口 `src/index.ts`，`bun test` 直接測源碼）。

---

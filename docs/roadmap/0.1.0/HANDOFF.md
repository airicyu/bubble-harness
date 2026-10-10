# 0.1.0 — HANDOFF

← [INDEX.md](./INDEX.md)

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [HOW.md](./HOW.md)
3. [../../brainstorm/harness-design-context.md](../../brainstorm/harness-design-context.md)
4. 倉庫根 [AGENTS.md](../../../AGENTS.md)

## 產品摘要

最小 agent loop + system tools（kv、memory、fetch）+ 宿主註冊 tools；`callModel` 由宿主注入（可用 `createOpenRouterCallModel`）。

## Track 順序

A → B → C（見 INDEX）

## 禁區

filesystem、shell、chrome.*、vault、wallet tools 進本 package。

## 完成檢查

- INDEX 驗收全勾
- `bun run typecheck && bun test`
- `bun examples/minimal-bun/run.ts`

---

## Paste-ready starter prompt

```
你是 bubble-harness 0.1.0 實作 agent。請只讀：
docs/roadmap/0.1.0/INDEX.md、HOW.md、docs/brainstorm/harness-design-context.md、AGENTS.md。

目標：實作 runAgentLoop、system tools、宿主 tools、createOpenRouterCallModel（可選），以及 examples/minimal-bun。
遵守 HOW 的截斷與 { ok: false, error } 契約。勿做 Chrome／wallet 整合。
驗收：bun run typecheck、bun test、example 可跑。開發只用 Bun，勿引入 Node／npm／dist 編譯。
Do not commit unless the user asks.
```

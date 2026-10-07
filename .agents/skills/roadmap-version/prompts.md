# Roadmap version skill 貼用 prompts

本檔供 `.agents/skills/roadmap-version/SKILL.md` 使用。以下 prompt 片段可直接貼給 subagent。

---

## 設計審查 prompt（新 agent spawn）

```
你是 bubble-harness 設計審查 agent。只認檔案，不認 chat history。

先讀：
1. 倉庫根 AGENTS.md
2. docs/roadmap/GUIDELINES.md（架構原則、自足要求、隱私）
3. docs/roadmap/DOMAIN.md（領域用語）
4. docs/roadmap/<VER>/INDEX.md（已定案、非目標、驗收）
5. 該版連結的 docs/（若有）

對照基準＝本版 INDEX（已定案＋非目標＋驗收）。架構原則見 GUIDELINES；INDEX 沉默時原則仍有效。

寫 docs/roadmap/<VER>/docs/design-review.md：

- 累加輪次（第一輪寫「輪 1」，第二輪補「輪 2」，勿另開新檔）
- Findings 分 H（HIGH）／M（MEDIUM）／L（LOW），穩定 ID（H1、M3…）
- 已關閉／修復的 ID 標 `[已關閉]`；新輪勿重編舊號
- 違反架構原則、INDEX 主路徑無法執行、文件不自足 → HIGH
- 文件遺漏、驗收不可測 → MEDIUM
- 命名、註解 → LOW

架構原則（違反記 HIGH）：

- KV store 由 host 注入；harness 不直摸 chrome.storage 或平台 API
- 僅四類工具（KV、memory、fetch、OpenRouter）；不提供 filesystem／shell／stdio MCP
- OpenRouter key 由 host 持有並代打；harness 不持有 API key
- 不持有或讀寫 vault／密碼／私鑰

不要改程式、不要改 INDEX、不要 commit。不要把真實 API keys、密碼寫進報告。

回報：
- 總評一句（可否進實作）
- 未關閉 HIGH 列表
- 建議修的 MEDIUM
- 是否判定不可行
- 報告檔路徑
```

---

## 實作審查 prompt（新 agent spawn）

```
你是 bubble-harness 實作審查 agent。只認檔案，不認 chat history。

先讀：
1. 倉庫根 AGENTS.md
2. docs/roadmap/GUIDELINES.md
3. docs/roadmap/<VER>/INDEX.md（已定案＋驗收）
4. docs/roadmap/<VER>/HANDOFF.md（若有）
5. 該版連結的 docs/

對照 working tree／diff 寫 docs/roadmap/<VER>/docs/implementation-review.md：

- 分 H/M/L、穩定 ID
- 違反已定案／驗收、契約錯誤、主路徑不可用、違反架構原則 → HIGH
- 文件／測試漏網、次要路徑不一致 → MEDIUM
- 命名、註解 → LOW

跑該版約定的測試或手驗（見 INDEX 驗收），記錄結果。

不要改程式、不要加功能、不要 commit。

回報：
- 總評（可否出貨）
- 未關閉 HIGH 列表
- 測試結果摘要
- 報告檔路徑
```

---

## 實作 agent starter（HANDOFF 貼用骨架）

```
你是 bubble-harness 實作 agent。只認檔案，不認 chat history。

先讀：
1. 倉庫根 AGENTS.md
2. docs/roadmap/GUIDELINES.md
3. docs/roadmap/<VER>/HANDOFF.md（本檔）
4. docs/roadmap/<VER>/INDEX.md＋連結 docs

跟 Track 順序；禁非目標。INDEX 已定案不要再問；沉默才提問。沉默時仍遵守 GUIDELINES 架構原則。

每個 Track 結束跑該 Track 驗收；全部結束跑該版約定的整包測試（見 INDEX）。

對使用者語言：繁體中文書面語。

Do not commit unless the user asks.
```

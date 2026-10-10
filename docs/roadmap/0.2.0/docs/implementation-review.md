# 0.2.0 實作審查

← [INDEX.md](../INDEX.md)

**輪次：** 輪 2（本檔累加；輪 1 原文保留於下）  
**審查基準：** 本版 INDEX（已定案、非目標、驗收）＋ [GUIDELINES.md](../../GUIDELINES.md) 架構原則。INDEX 沉默時原則仍有效。  
**對照：** [HOW.md](../HOW.md)、[reasoning.md](../reasoning.md)、[HANDOFF.md](../HANDOFF.md)、[0.1.0 HOW](../../0.1.0/HOW.md)，以及 working tree 的 `src/sandbox.ts`、`src/index.ts`、`test/sandbox.test.ts`、`docs/roadmap/README.md`。本輪不改程式、不改 INDEX。

## 輪 2 總評

輪 1 的 H1、M1、M2、M3、M4、M5 都已由現行程式與測試關閉。Guest 仍重用 `createHarness`／`runAgentLoop`，權限呼叫走 JSON port，`src/` 無 `chrome` import。**可出貨：** 無未關閉 HIGH；輪 1 的 MEDIUM 皆已關閉。本輪沒有新的 HIGH 或 MEDIUM。INDEX 驗收勾選仍是空的，本輪依指示不改 INDEX。

## 輪 2 測試

倉庫根執行（2026-10-10）：

| 指令 | 結果 |
|------|------|
| `bun run typecheck`（`tsc --noEmit`） | 通過，exit 0 |
| `bun test`（bun 1.4.2） | 通過，12 pass / 0 fail（`test/sandbox.test.ts` 9、`test/loop.test.ts` 3） |

## 輪 2 關閉核對

| ID | 狀態 | 現檔依據 |
|----|------|----------|
| H1 | [已關閉] | `src/sandbox.ts` 定義 `SandboxRequest`、`SandboxClose`、`SandboxResponse`。`src/index.ts` 以 `export type` 匯出這三個型別，以及 `SandboxOp`、`SandboxPort`、`SandboxGuestOptions`、`SandboxHostHandlers`、`SandboxHostToolSchema`，並匯出三個函式。 |
| M1 | [已關閉] | `host tool failure returns structured error and the loop continues`：host tool `execute` throw `kaboom` 後，tool content 含 `"ok":false` 與 `kaboom`，`stopReason` 為 `completed`。 |
| M2 | [已關閉] | 同一則 memory 測試在 loop 之後呼叫 guest `memory.get`，斷言值為 `2`。Host 的 KV map 只有 `kv.set` 寫入的 `a`。 |
| M3 | [已關閉] | `jsonClone` 比對序列化前後形狀；函式、`undefined` 等被省略時 throw `Result is not JSON-serializable`，`handleRequest` 回 `ok: false` 與該字串。測試 `non-serializable host tool result uses the contract error` 斷言 guest reject 此訊息。 |
| M4 | [已關閉] | `createSandboxGuest` 在 `createHarness` throw 時 `unsubscribe()`。`duplicate host tool schema unsubscribes the guest` 斷言 listener 計數回到 0。 |
| M5 | [已關閉] | `docs/roadmap/README.md` 版本表 0.2.0 列為 `in progress`，與本版 INDEX 狀態一致。 |

## 輪 2 Findings

（無新項。）

## 輪 2 未列入

- H1–M5 舊號保留，見上表，本輪不重開。
- 輪 1「未列入」的主路徑（先登記 `id` 再 `postMessage`、忽略壞訊息、close 訊息、allowlist 只在 guest、不改 loop 語意、無逾時）仍與現行程式一致。
- INDEX 驗收勾選仍空。版本號仍是 `0.1.0-dev`；狀態為 `in progress`，出貨時才對齊 changelog／`package.json`。

## 輪 2 判定

| 問題 | 結論 |
|------|------|
| 可否出貨 | 是。無未關閉 HIGH；輪 1 的 MEDIUM 皆已關閉 |
| 未關閉 HIGH | （無） |
| 建議修的 MEDIUM | （無） |
| 整版是否不可行 | 否。隔離端跑 loop、有權限端經 JSON port 執行，主路徑與輪 1 缺口都已由測試蓋住 |

報告路徑：`docs/roadmap/0.2.0/docs/implementation-review.md`

---

## 輪 1（原文）

**輪次：** 輪 1  
**審查基準：** 本版 INDEX（已定案、非目標、驗收）＋ [GUIDELINES.md](../../GUIDELINES.md) 架構原則。INDEX 沉默時原則仍有效。  
**對照：** [HOW.md](../HOW.md)、[reasoning.md](../reasoning.md)、[HANDOFF.md](../HANDOFF.md)、[0.1.0 HOW](../../0.1.0/HOW.md)，以及 working tree 的 `src/sandbox.ts`、`src/index.ts`、`test/sandbox.test.ts`、`docs/roadmap/0.2.0/`。本輪不改程式、不改 INDEX。

## 輪 1 總評

Guest 重用 `createHarness`／`runAgentLoop`，kv／fetch／`callModel`／host tool `execute` 走 JSON port，`bubble-harness.sandbox.close` 會拒絕尚未完成的請求。`src/` 無 `chrome` import，0.1.0 loop 檔未改。架構四原則成立。

**不可出貨：** 有未關閉 HIGH。主路徑行為與 Track C 驗收句大多已由測試與程式對上，但驗收要求匯出的 HOW 訊息型別尚未出現在公開入口。

## 輪 1 測試

倉庫根執行（2026-10-10）：

| 指令 | 結果 |
|------|------|
| `bun run typecheck`（`tsc --noEmit`） | 通過，exit 0 |
| `bun test`（bun 1.4.2） | 通過，9 pass / 0 fail（`test/sandbox.test.ts` 6、`test/loop.test.ts` 3） |

## 驗收逐條（本輪代核；未改 INDEX 勾選）

| 驗收 | 結論 |
|------|------|
| `bun run typecheck` 通過 | 通過 |
| `bun test` 通過（含既有 loop 測試） | 通過 |
| Guest 經 port 完成至少一次 `kv` 與一次 host tool | 通過（`guest loop uses host kv and host tool execute`） |
| `fetch` allowlist 拒絕時 host `fetchImpl` 未被呼叫 | 通過 |
| Host `callModel` throw 時 guest `runAgentLoop` reject | 通過（訊息 `model down`） |
| Guest 收到 `bubble-harness.sandbox.close` 時未完成請求 reject，且不靠與 host 共享記憶體 | 通過。掛起表在 guest 閉包；close 測試用永遠不 resolve 的 host `kv.get`，reject 訊息為 `Sandbox port closed` |
| `src/index.ts` 匯出三個函式與 HOW 的型別 | **未過**。三個函式以及 `SandboxPort`、`SandboxOp`、`SandboxGuestOptions`、`SandboxHostHandlers`、`SandboxHostToolSchema` 已匯出。HOW 的 `SandboxRequest`、`SandboxClose`、`SandboxResponse` 未匯出。見 H1 |
| `src/` 無 `chrome` import | 通過 |

## 輪 1 Findings

### H1 — HOW 的訊息型別沒有從公開入口匯出

**狀態：** [ 已修復，待複審 ]

INDEX 驗收要求 `src/index.ts` 匯出 `createSandboxGuest`、`createSandboxHost`、`createInProcessSandboxPorts` 與 HOW 的型別。HOW「訊息」定義了 `SandboxOp`、`SandboxRequest`、`SandboxClose`、`SandboxResponse`。

`src/index.ts` 有三個函式與 `SandboxOp`。`SandboxRequest`、`SandboxClose`、`SandboxResponse` 在 `src/sandbox.ts` 不存在，也沒有匯出。已定案公開 API 的執行期行為不依賴這三個名稱，但該條驗收目前不成立。

### M1 — Track B 的失敗回應沒有測試

**狀態：** [ 已修復，待複審 ]

Track B 驗收要假 `kvStore`、假 `callModel`、假 host tool 證明成功與 `{ ok: false, error }` 都回到 guest port。`handleRequest` 在 handler throw 時會送 `ok: false` 與 `error`，guest 在 `ok: false` 時 `reject Error(error)`（缺字串 `error` 時用 `Sandbox request failed`）。

現有測試只覆蓋成功的 kv／host tool、`callModel` throw（loop reject，不是 tool 的 `{ ok: false }`）、allowlist、close、`kv.get` 的 JSON `null`。沒有案例證明 tool 路徑的 `{ ok: false, error }` 回到 guest，也沒有證明 loop 把它寫成 `{ "ok": false, "error" }` 且不終止。

### M2 — 「memory 不經 host」沒有被斷言

**狀態：** [ 已修復，待複審 ]

Track C 要求 `bun test` 覆蓋 memory 不經 host。`guest loop uses host kv and host tool execute; memory stays local` 讓模型同時呼叫 `kv.set`、`memory.set`、`ping`，斷言只有 KV map 與 host tool 計數。程式上 `memory` 留在 `createHarness` 的 `Map`，不會送 `hostTool`。測試沒有讀回 guest memory，也沒有檢查 port 上不出現 memory 操作。名稱寫了「memory stays local」，斷言沒有鎖住這句。

### M3 — 無法 JSON 序列化的 `result` 沒有回規定錯誤

**狀態：** [ 已修復，待複審 ]

HOW：host 收到無法 JSON 序列化的 `result` 時，回 `{ ok: false, error: "Result is not JSON-serializable" }`。`handleRequest` 用 `JSON.stringify` 包住整筆回應來判斷。物件裡的 `undefined` 或函式會被省略而不是拋錯，host 仍送 `ok: true`。Guest 再做 `JSON.parse(JSON.stringify(...))` 後 `result` 鍵消失，改 reject `Error('Sandbox request failed')`。

可序列化的主路徑（`kv.get` 的 `null`、`kv.set` 的 `{ ok: true }`、host tool 的純資料）不受影響。函式不會穿越 port。錯的是這條失敗契約的錯誤字串與 `ok`。

### M4 — `createSandboxGuest` 在 `createHarness` 失敗時留下訂閱

**狀態：** [ 已修復，待複審 ]

`createSandboxGuest` 先 `port.onMessage`，再 `createHarness`。`hostToolSchemas` 與 system tool 同名或名稱重複時，`createHarness` 會 throw（與 HOW 一致），但 guest listener 沒有解除。之後 close 訊息仍會打進這個已失敗的建構所留下的 handler。

### M5 — roadmap 目錄把 0.2.0 標成 planned

**狀態：** [ 已修復，待複審 ]

[docs/roadmap/README.md](../../README.md) 版本表寫 0.2.0 狀態 `planned`。本版 INDEX 狀態是 `in progress`。

## 輪 1 未列入

- KV 由 host 注入、工具仍是既有四類加 host tool `execute`、不持 API key／vault、`src/` 只用 Web API 與 Bun 測試：與已定案及架構原則一致，不記 HIGH。
- 請求先 `pending.set` 再 `postMessage`。進程內配對同步送達時，回應對得到 `id`。
- `kind` 不符、`JSON.parse(JSON.stringify)` 拋錯、或序列化結果不是非 null 物件時，listener 回傳而不丟出。
- `ok: true` 且缺少 `result` 鍵時，guest reject `Error('Sandbox request failed')`。HOW 規定該鍵必須存在，沒有另定這條錯誤字串。
- Host `close()` 先送 `{ kind: 'bubble-harness.sandbox.close' }` 再解除 host 訂閱。Guest 拒絕掛起請求後解除自己的訂閱。
- `fetch` allowlist 只在 guest 的 `executeSystemTool`。沒有第二套 host allowlist。
- `loop.ts` 的 `stopReason`、截斷、tool structured error 未改。`callModel` 的 reject 不進 tool catch。
- 本版無逾時。close 之後 guest 若再 `request`，實作直接 throw `Sandbox port closed`，而不是掛起。已定案只要求拒絕尚未完成的請求。
- INDEX 驗收勾選仍是空的。本輪依指示不改 INDEX；上表是審查代核。
- 版本號仍是 `0.1.0-dev`。INDEX 狀態為 `in progress`，出貨時才對齊 changelog／`package.json`。

## 輪 1 判定

| 問題 | 結論 |
|------|------|
| 可否出貨 | 否。有未關閉 HIGH |
| 未關閉 HIGH | H1 |
| 建議修的 MEDIUM | M1、M2、M3、M4、M5 |
| 整版是否不可行 | 否。隔離端跑 loop、有權限端經 JSON port 執行，主路徑已可跑 |

報告路徑：`docs/roadmap/0.2.0/docs/implementation-review.md`

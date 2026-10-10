# 0.2.0 設計審查

← [INDEX.md](../INDEX.md)

**輪次：** 輪 3（本檔累加；輪 2、輪 1 原文保留於下）  
**審查基準：** 本版 INDEX（已定案、非目標、驗收）＋ [GUIDELINES.md](../../GUIDELINES.md) 架構原則。INDEX 沉默時原則仍有效。  
**對照：** [0.1.0 INDEX](../../0.1.0/INDEX.md)、[0.1.0 HOW](../../0.1.0/HOW.md)、本版 [HOW.md](../HOW.md)、[reasoning.md](../reasoning.md)、[HANDOFF.md](../HANDOFF.md)。本輪不改程式、不改 INDEX／HOW／reasoning／HANDOFF。

## 輪 3 總評

架構四原則仍成立。輪 1 的 H1、M1–M4、L1 與輪 2 的 M5、M6 都已寫進現有 INDEX／HOW／reasoning／HANDOFF。**設計閘門通過：** 無未關閉 HIGH；本輪沒有新的 MEDIUM。

## 輪 2 關閉核對

| ID | 狀態 | 現檔依據 |
|----|------|----------|
| M5 | [ 已關閉 ] | HOW Guest：「先把 `id` 登記成掛起的 Promise，再 `postMessage`」。並寫明進程內配對同步呼叫 listener，先送再登記時回應會因對不到 `id` 被忽略、請求一直掛著。 |
| M6 | [ 已關閉 ] | HOW 處理規則：`JSON.parse(JSON.stringify(data))` 的結果若不是非 null 物件（`null`、數字、字串、陣列），忽略，不要讀 `kind` 而拋錯。 |

## 輪 3 Findings

（無新項。）

## 輪 3 未列入

- M5、M6 的舊號保留，見上表，本輪不重開。
- KV 由 host 注入、不提供 filesystem／shell／stdio MCP、OpenRouter key 只在 host 的 `callModel` 閉包、不碰 vault／密碼／私鑰：已定案與非目標與此一致，不記 HIGH。
- `close` 只承諾拒絕尚未完成的請求；其後若再送請求，host 已解除訂閱且本版無逾時，與已定案「不回應則一直掛著」同一條規則，不單獨立項。
- Host tool 的 `execute` 仍接收已 parse 的參數物件：0.1.0 HOW 已寫，0.2.0 payload 把 `args` 與 `name` 分開，且禁止改 loop／tool 語意。

## 輪 3 判定

| 問題 | 結論 |
|------|------|
| 可否進實作 | 是。無未關閉 HIGH |
| 未關閉 HIGH | （無） |
| 建議修的 MEDIUM | （無） |
| 整版是否不可行 | 否。Guest 跑 loop、host 持權限、JSON port 含關閉訊息，可實作 |

報告路徑：`docs/roadmap/0.2.0/docs/design-review.md`

---

## 輪 2（原文）

**輪次：** 輪 2  
**審查基準：** 本版 INDEX（已定案、非目標、驗收）＋ [GUIDELINES.md](../../GUIDELINES.md) 架構原則。INDEX 沉默時原則仍有效。  
**對照：** [0.1.0 INDEX](../../0.1.0/INDEX.md)、[0.1.0 HOW](../../0.1.0/HOW.md)、本版 [HOW.md](../HOW.md)、[reasoning.md](../reasoning.md)、[HANDOFF.md](../HANDOFF.md)。本輪不改程式、不改 INDEX／HOW／reasoning／HANDOFF。

## 輪 2 總評

架構四原則仍成立，輪 1 的 H1、M1、M2、M3、M4、L1 都已寫進現有 INDEX／HOW／reasoning／HANDOFF。**設計閘門通過：** 無未關閉 HIGH；新的 MEDIUM 是畸形訊息與進程內同步時序，不擋住「註冊掛起後再送請求、訊息為 JSON 物件」的主路徑。

（此總評僅描述輪 2 當時的檔案。輪 3 時 M5、M6 已關閉，見文首。）

## 輪 1 關閉核對

| ID | 狀態 | 現檔依據 |
|----|------|----------|
| H1 | [ 已關閉 ] | INDEX Port：`close()` 先送 `{ kind: 'bubble-harness.sandbox.close' }`，guest 以 `Error('Sandbox port closed')` 拒絕未完成請求。HOW 有 `SandboxClose`。reasoning 寫明關閉必須走 port、測試不得與 host 共用 pending map。驗收與 Track C 要求依該訊息失敗。 |
| M1 | [ 已關閉 ] | [HANDOFF.md](../HANDOFF.md) 存在，含讀檔順序與 paste-ready starter prompt。INDEX 文件地圖連結有效。 |
| M2 | [ 已關閉 ] | HOW 處理規則已寫：序列化拋錯則忽略且 listener 不拋；對不到的 `id` 忽略；`ok: false` 缺字串 `error` 時 `Error('Sandbox request failed')`；`ok: true` 必須有 `result`，`kv.get` 找不到為 JSON `null`。 |
| M3 | [ 已關閉 ] | INDEX 錯誤節、Track C、驗收皆要求 host `callModel` throw 時 guest 的 `runAgentLoop` promise reject。 |
| M4 | [ 已關閉 ] | reasoning 寫明 allowlist 只約束遵循本函式庫的 loop，惡意 guest 可直接 `postMessage` `fetch`；本版不把 host allowlist 當契約，宿主可在自己的 `fetchImpl` 拒絕。HANDOFF 禁區重申不要加第二套 host allowlist。 |
| L1 | [ 已關閉 ] | HOW Guest：`createSandboxGuest` 內部呼叫 `createHarness`，與 system tool 同名或 schema 名稱重複時 throw，不改成 port 錯誤。 |

## 輪 2 Findings

### M5 — 進程內同步送達與「對不到 id 就忽略」合在一起時，掛起表的登記順序沒寫

**狀態：** [ 已關閉 ]

HOW 寫 `createInProcessSandboxPorts` 的 `postMessage` 在同一 turn 同步呼叫對方 listener，且回應 `id` 對不到掛起請求就忽略。本版沒有逾時，對不到的回應不會再來一次。

主路徑若先 `postMessage`、回到 guest 才把 `id` 放進掛起表，host 的同步回應會被忽略，該次 `kv`／`callModel` 永遠掛著。可實作的順序是先登記掛起、再送請求。文件沒寫這句，兩個實作 agent 會一個通過 Track B／C、一個在進程內配對上假死。分離進程若 host 真正非同步回應，後一種寫法仍可能碰巧成功，驗收會隨傳輸時序分叉。

**不擋主路徑：** 契約做得到；補一句登記順序即可。

### M6 — 序列化成功但不是物件的訊息，listener 仍可能拋出

**狀態：** [ 已關閉 ]

HOW 只規定 `JSON.parse(JSON.stringify(data))` **拋錯**時忽略，且不要讓 listener 拋出。`null`、數字、字串可成功往返，接著讀 `kind` 會丟出。Host 又寫「只處理 `kind === 'bubble-harness.sandbox'` 的物件」，沒寫非物件時要先忽略。

正式宿主的 `postMessage` 可能送進非物件。主路徑雙方都送 HOW 的三種 JSON 物件時不受影響。

**不擋主路徑：** 補「往返結果不是物件則忽略」即可。

## 輪 2 未列入

- KV 由 host 注入、不提供 filesystem／shell／stdio MCP、OpenRouter key 只在 host 的 `callModel` 閉包、不碰 vault／密碼／私鑰：已定案與非目標與此一致，不記 HIGH。
- `close` 的跨端語意、HANDOFF、畸形物件訊息、`callModel` 失敗驗收、allowlist 威脅模型、host tool 名稱沿用 `createHarness`：見上表，本輪不重開。
- 0.1.0 的 `stopReason`、截斷、structured tool error：INDEX 非目標與 HOW 禁止項維持不改 loop 語意。Guest 重用 `createHarness`／`runAgentLoop`；tool 失敗仍由 proxy throw、loop 寫成 `{ "ok": false, "error" }`；`callModel` 失敗仍 reject。

## 輪 2 判定

| 問題 | 結論 |
|------|------|
| 可否進實作 | 是。無未關閉 HIGH |
| 未關閉 HIGH | （無） |
| 建議修的 MEDIUM | M5、M6（輪 2 當時；輪 3 皆已關閉） |
| 整版是否不可行 | 否。Guest 跑 loop、host 持權限、JSON port 含關閉訊息，可實作 |

報告路徑：`docs/roadmap/0.2.0/docs/design-review.md`

---

## 輪 1（原文）

**輪次：** 輪 1  
**審查基準：** 本版 INDEX（已定案、非目標、驗收）＋ [GUIDELINES.md](../../GUIDELINES.md) 架構原則。INDEX 沉默時原則仍有效。  
**對照：** [0.1.0 INDEX](../../0.1.0/INDEX.md)、[0.1.0 HOW](../../0.1.0/HOW.md)。本輪不改程式、不改 INDEX。

### 總評

方向與 0.1.0 同進程語意相容，架構四原則（KV 由 host 注入、工具不擴成 filesystem／shell／stdio MCP、OpenRouter key 留在 host、不碰 vault）在已定案裡站得住。**尚不可進實作：** `close()` 要拒絕另一端尚未完成的請求，但訊息契約沒有任何可跨 JSON port 傳達這件事的訊息，分離進程的主路徑做不到。

（此總評僅描述輪 1 當時的檔案。輪 2 時 H1 已關閉，見文首。）

### 與 0.1.0 的語意

未發現偷偷改寫。Guest 重用 `createHarness`／`runAgentLoop`；tool 失敗仍是 guest proxy throw、由既有 loop 寫成 `{ "ok": false, "error" }`；`callModel` 失敗仍 reject、loop 不吞；memory 留在 guest harness 實例；`createHarness` 同進程路徑列為非目標中的「不改變」。`fetch` allowlist 沿用 `executeSystemTool`（送 port 前拒絕）與 0.1.0 一致。無 `sessionId` 並未推翻 0.1.0 HOW（該版本來就由呼叫端持有 messages）。

### Findings

#### H1 — `close()` 無法只靠現有 JSON 訊息拒絕 guest 請求

**狀態：** [ 已關閉 ]

INDEX 寫 `createSandboxHost(...).close()` 解除訂閱，並以 `Error('Sandbox port closed')` 拒絕 **guest** 端尚未完成的請求。產品句又寫兩邊只經 JSON port 往返。HOW 的訊息只有 `bubble-harness.sandbox` 與 `bubble-harness.sandbox.result`，沒有關閉、取消或對應 id 的失敗廣播。

進程內測試可以用共享狀態直接 reject guest Promise，驗收「`close()` 拒絕未完成請求」會假綠。正式宿主只拿到兩個 `SandboxPort`（iframe／`MessageChannel` 接線雖不在本版實作，契約必須在分離兩端仍成立）時，host 呼叫 `close()` 沒有任何已記載的位元組可送到 guest。這與「不回應就一直掛著」同時成立時，`close()` 的跨端效果沒有可實作定義。

**需補：** 一種可 JSON 序列化、guest 能據以 reject 掛起 Promise 的 port 訊息（或改已定案：`close()` 只解除 host 訂閱，不承諾叫醒 guest）。補上後 Track C 該條才測得到分離語意。

#### M1 — 文件地圖指向不存在的 HANDOFF

**狀態：** [ 已關閉 ]

INDEX 文件地圖有 [HANDOFF.md](../HANDOFF.md)，倉庫中該路徑沒有檔案。HOW 與 reasoning 的相對連結有效。實作前依工作流應有 HANDOFF；在那之前地圖不應把缺檔當成已存在。

#### M2 — 畸形訊息與回應關聯未定義

**狀態：** [ 已關閉 ]

已寫：`kind` 不符則忽略；`id` 由 guest 產生、同一連線不重複、host 原樣帶回；`ok: false` 時 guest reject `Error(error)`。未寫：

- `JSON.parse(JSON.stringify(data))` 拋錯（`undefined`、循環參照）時是忽略還是打掛 listener
- 回應 `id` 對不到掛起請求時是否忽略
- `ok: false` 但缺少 `error` 時 throw 的訊息
- `ok: true` 且欄位省略時，`kv.get` 的 JSON `null` 必須保留（省略會變成 `undefined`，偏離 0.1.0 `string | null`）

主路徑可以猜，但兩個實作 agent 會做出不相容的 port。

#### M3 — 已定案的 `callModel` 失敗路徑沒有驗收

**狀態：** [ 已關閉 ]

錯誤節寫明 `callModel` 失敗時 guest reject、loop 不吞。驗收與 Track C 涵蓋 kv、host tool、allowlist、`close()`，沒有一則要求 `callModel` handler 失敗時行為與同進程注入相同。該契約目前不可從 checklist 客觀打勾。

#### M4 — allowlist 只在 guest，與 sandbox 威脅模型的界線沒寫清

**狀態：** [ 已關閉 ]

已定案：不允許的 URL 不送出 port，檢查點是 guest 的 `executeSystemTool`。這沿用 0.1.0，**沒有**改同進程語意。DOMAIN 把 sandbox 裡的 harness 當成不可信。不可信 guest 可跳過 allowlist、直接 `postMessage` 一筆 `fetch`。Host 預設還會用 Web `fetch` 代打。

這不違反「key 不進 port／不碰 vault」。它表示 allowlist **不是** host 強制的安全邊界。reasoning 應寫明這是迴圈內的使用檢查；若產品要擋惡意 guest，必須另定 host 側規則並改已定案。

#### L1 — host tool 名稱衝突依賴重用 `createHarness` 才看得到

**狀態：** [ 已關閉 ]

0.1.0 在 `createHarness` 對與 system tool 同名、以及重複的 host tool 名稱直接 throw。0.2.0 HOW 只寫 host 端找不到 `execute` 時回錯誤，沒寫 guest 註冊 `hostToolSchemas` 時沿用上述 throw。實作若依 HOW「內部呼叫 `createHarness`」會自然保留；寫進 HOW 一句即可，避免 guest 另做註冊表時放寬 0.1.0。

### 未列入

- OpenRouter key、KV、`chrome.*`、vault／私鑰、filesystem／shell／MCP：已定案與非目標與此四原則一致，不記 HIGH。
- 不設請求逾時、不做 `sessionId`：reasoning 有理由，且未改 0.1.0 loop 契約。
- `id` 的字串格式：計數器即可，不單獨立項。

### 判定

| 問題 | 結論 |
|------|------|
| 可否進實作 | 否，先關 H1（輪 1 當時；輪 2 已關閉） |
| 未關閉 HIGH | H1（輪 1 當時） |
| 建議修的 MEDIUM | M1、M2、M3、M4（輪 2 皆已關閉） |
| 整版是否不可行 | 否。分割 guest／host 的 JSON port 可行；不可實作的是當時的 `close()` 跨端語意 |

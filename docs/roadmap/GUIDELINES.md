# Roadmap 寫作指南（bubble-harness）

← [倉庫根 AGENTS.md](../../AGENTS.md) · **開發節奏：** [agent-workflow.md](./agent-workflow.md)

本檔規範如何寫 `docs/roadmap/`，讓 **另一個沒有對話紀錄的 agent** 也能正確開工。  
寫 roadmap 的 agent 與實作的 agent 常常不是同一個；**對話裡談過但沒寫進檔案的內容，對實作 agent 等於不存在。**

**怎麼開新 agent、何時 design-review／implementation-review、HANDOFF、Track 間自測** → 見 [agent-workflow.md](./agent-workflow.md)。本檔專注 **文件自足、INDEX 結構、本專案原則**。

---

## 核心原則：Self-sufficient（強制）

Roadmap 是 **跨 agent 交接文件**，不是當下對話的備忘草稿。

| 要求 | 說明 |
|------|------|
| **自足** | 只靠本版 `INDEX`＋其連結的 `docs/`，新 agent 就能知道要做什麼、不要做什麼、怎麼驗收 |
| **禁止腦內省略** | 寫的人「知道那是什麼」不夠；讀的人必須不靠猜測也懂 |
| **禁止過短條目** | 不可只有幾個關鍵字（如「改 API」「加工具」）；每條須寫清 **做什麼、做成什麼樣子、邊界在哪** |
| **相關脈絡一併寫清** | 依賴的舊行為、要推翻的舊語意、相關介面定義，都寫在檔內或明確連結並摘要，勿假設讀者讀過某次 chat |
| **隱私** | **不要把真實的 API keys、密碼寫入 roadmap**（見下節）；範例用虛構資料與標明的測試向量 |

### 自檢（寫完／開工前）

> **若一個新 agent 只讀這些檔、完全沒有我們的對話，會不會誤解或亂猜？**

若答案不是「幾乎不可能誤解」，就還沒寫夠——補句子，不要補暗示。

---

## 隱私（強制）

`docs/roadmap/` 會進 git，**不是**秘密保管庫。

| 可以寫 | 不可以寫 |
|--------|----------|
| 介面名稱、函式簽名、工具描述 | OpenRouter API key、真實密碼、私鑰 |
| 虛構測試資料（`test.example.com`） | 從真實環境抄出的 secrets |
| 明確標成測試向量的公開範例 | 生產環境 URL 上的 secret token |
| 產品詞與契約 | 把個人帳號 key 當「範例設定」抄進來 |

說明失敗模式時，另造虛構資料。審查報告同樣禁止貼上列內容。

---

## 生命周期

| 階段 | 產物 | 門檻 |
|------|------|------|
| 構想 | `backlog/*.md`（可較短，但仍須讓人看懂題目） | 非承諾 |
| 排程 | `docs/roadmap/X.Y.Z/INDEX.md`（可先 rough） | 有版本號與產品句 |
| Briefing | 更新 INDEX：已定案、非目標、驗收；需要時加 `docs/`、`reasoning.md` | **待拍板清空或標成非目標** |
| 開工 | — | **「讀完本版 roadmap 即可開工」** |
| 出貨 | 勾驗收；版本／changelog 同步；**清 backlog** | 狀態 → `shipped` |

Rough INDEX 允許暫時簡短，但 **進入實作前必須升格為自足稿**。

版本號用 `X.Y.Z`（例 `0.1.0`）。目錄名與 INDEX 標題一致。**Patch**（`Z`，例如 `0.1.1`）只給該 minor 的 bugfix，**不**排新功能；新功能開下一個 **minor** 目錄。

---

## INDEX 最低必要欄位

每版 `INDEX.md` 至少包含：

1. **標題**、上游版本、changelog 連結、**狀態**（`planned`／`in progress`／`shipped`）
2. **產品句**（一句：本版要做什麼、邊界在哪）
3. **已定案**（題 → 決定；給實作 agent「勿再問、勿擅自改語意」）
4. **非目標**（防膨脹；可鏈 backlog）
5. **驗收**（可勾 checklist；寫清通過長什麼樣，含該版測試或手驗步驟）
6. **錨點檔案**（改前必讀的程式／文件路徑 + 一句用途）

強烈建議（中型以上）：

- **文件地圖／閱讀順序**
- **實作軌道**（Track）：每軌寫 **做什麼／不要做什麼／驗收**
- **與上一版對照**
- 未收斂題目用 **「開工前仍須拍板」** 表，**不要**與已定案混寫

狀態用語：`planned` → `in progress` → `shipped`。

---

## 文件分工

| 檔 | 職責 |
|----|------|
| **INDEX.md** | 做什麼、不做什麼、軌道、驗收（**WHAT**） |
| **DOMAIN.md** | 跨版領域用語；與 INDEX 衝突時以 **該版 INDEX** 為準並應回寫 DOMAIN |
| **docs/\*.md** | API 形狀、介面定義、錯誤處理契約（**HOW**） |
| **docs/reasoning.md** | 為何這樣定、反例、否決過的方案（**WHY**） |

---

## 何時需要 `reasoning.md`

Detail briefing 之後，若定案對後續判斷有影響，**應寫 reasoning**。

### 應該寫

- 否決或推翻舊文件／舊語意
- 討論過 ≥2 個方案並選定
- 定案靠 **反例／失敗模式** 撐住
- 擔心日後有人「好心改契約」卻不懂在防什麼

### 可以不寫

僅當內容 **trivial**，且寫 INDEX 的人有把握：新開 agent 只讀 INDEX 也幾乎不可能誤解。  
不確定時：**寫。**

---

## 依複雜度選厚度

| 類型 | 最低文件 |
|------|----------|
| 小改 | 自足的 INDEX 即可；可不寫 reasoning |
| 中改 | INDEX + 1–2 份 docs |
| 大改（API 契約、儲存格式、執行模型） | INDEX + docs + **reasoning** + 分 Track |

**厚度可省，自足不可省。**

---

## Backlog

- `backlog/`＝**尚未出貨**的構想，不是承諾範圍
- 清單只維護 [backlog/INDEX.md](./backlog/INDEX.md)；新增項目時加一列並寫對應 `.md`
- 排進某版後：INDEX ↔ backlog **雙向連結**
- **已經出貨的不該再佔 backlog**：該版 `shipped` 後立刻刪 backlog 列與對應 `.md`；真相只留在 `docs/roadmap/X.Y.Z/`

---

## 寫作 agent 檢查清單

- [ ] 不讀聊天紀錄也能執行本版
- [ ] 已定案每條都是完整句子／完整決定
- [ ] 非目標與範圍膨脹項已寫出或鏈到 backlog
- [ ] 驗收可客觀判斷（含該版測試或手驗）
- [ ] 錨點路徑正確
- [ ] 非顯設計取捨 → 已有 reasoning（或 INDEX 內等長 WHY）
- [ ] 無「待拍板」殘留（否則仍為 planned）
- [ ] **無真實 API keys、密碼、個人 secrets**

---

## 實作完成時

- 勾驗收；狀態改 `shipped`（僅在驗收與該版測試通過、且使用者同意出貨時）
- 更新倉庫根 `version.md`／`changelog.md`
- 更新 `package.json` 的 `version` 欄位
- **清 backlog**
- 若改了 API 契約、儲存格式：同步該版 INDEX 點名的契約檔；契約檔尚不存在時，由該版建立並在 INDEX 寫路徑

---

## 本專案補充

bubble-harness 是為受限 JavaScript 環境設計的 **agent harness library**。

### 背景與定位

| 項目 | 說明 |
|------|------|
| **用途** | 輕量級 agent 執行框架；可在 Chrome extension sandbox 等受限環境運行 |
| **消費方** | 例如 airwave-wallet（Solana 錢包擴充），將其嵌入隔離環境提供 query-only agent 服務 |
| **工具限制** | 僅四類：KV store（host 注入）、memory variables、fetch、OpenRouter；**無** filesystem／shell／stdio MCP |
| **安全原則** | Host 確保 harness 無法存取 vault 或密碼；harness 不持鑰、不代簽 |

### 架構原則（INDEX 未明確推翻前一律有效）

違反下列而當主路徑，設計審查記 **HIGH**：

1. **KV store 由 host 注入。** Harness 不直接呼叫 `chrome.storage` 或其他平台 API；儲存介面由 host bridge 提供。
2. **僅四類工具。** 不提供 filesystem、shell、arbitrary MCP stdio 工具；與「受限環境」定位衝突的能力不應進主路徑。
3. **不持有密碼或私鑰。** Harness 不讀、不寫、不接觸 vault；安全責任屬於 host。
4. **設計上可在瀏覽器運行。** 避免依賴 Node 專屬 API（例如 `fs`、`child_process`）。開發與測試只用 **Bun**（`bun test`、直接執行 `.ts`）；勿把 Node／npm 當專案工具鏈。

INDEX 可以收窄範圍（例如本版不做 MCP client），不可以悄悄加入違反定位的能力來「先跑起來」。要推翻某條原則，必須寫進該版已定案並說明取代模型。

### 出貨檔案

| 項目 | 約定 |
|------|------|
| Changelog | 倉庫根 `changelog.md` |
| 版本號 | 與該版目錄 `X.Y.Z` 一致；`package.json` 的 `version` 與 changelog 對齊 |
| 測試 | `bun test`（直接測 `src/` TypeScript）。某版若另有手驗，寫在該版 INDEX |
| 實作範圍 | 只改 `bubble-harness` 倉庫 |

### 第一天就要對的事

就算某版只做垂直切片，仍須讓 **KV store 注入、工具限四類、不持密碼** 符合上面的原則。可以不做 MCP client 或複雜推理；不可以假設 harness 能直摸平台 API 或讀 vault。

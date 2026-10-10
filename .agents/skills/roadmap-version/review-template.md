# Design / Implementation Review 報告骨架

本檔供審查 agent 參考。實際報告應依該版具體情況調整。

---

## Design Review 骨架

```markdown
# Design Review — 0.X.Y

## 輪 N（YYYY-MM-DD）

**對照基準：** docs/roadmap/0.X.Y/INDEX.md（已定案、非目標、驗收）  
**架構原則：** docs/roadmap/GUIDELINES.md

### 總評

（一句：本輪可否進實作，或仍有 HIGH 待關）

### Findings

#### HIGH

- **H1** — 【已關閉／未關閉】（簡述問題；引用 INDEX／GUIDELINES 違反處）
- **H2** — …

#### MEDIUM

- **M1** — （簡述；可標「非阻擋」若不擋主路徑）
- **M2** — …

#### LOW

- **L1** — （簡述）

### 未關閉 HIGH

（清單；空白則通過設計閘門）

### 建議下一步

（收斂或再審；若不可行則停止並說明）
```

---

## Implementation Review 骨架

```markdown
# Implementation Review — 0.X.Y

## 輪 N（YYYY-MM-DD）

**對照基準：** docs/roadmap/0.X.Y/INDEX.md（已定案＋驗收）  
**Diff 範圍：** （commit range 或 working tree）

### 總評

（一句：可否出貨，或有 HIGH 待修）

### Findings

#### HIGH

- **H1** — 【已關閉／未關閉】（違反已定案／驗收／架構原則）
- **H2** — …

#### MEDIUM

- **M1** — （文件／測試漏網；可標「非阻擋」）
- **M2** — …

#### LOW

- **L1** — （命名、註解）

### 驗收對照

（逐條核對 INDEX 驗收；勾選或說明未通過項）

- [x] 驗收句 A
- [ ] 驗收句 B（說明為何未通過）

### 測試結果

（該版約定的測試或手驗；記錄指令與輸出摘要）

```bash
bun test
# （結果）

bun run typecheck
# （結果）
```

### 未關閉 HIGH

（清單；空白則可出貨）

### 建議下一步

（修復或複審）
```

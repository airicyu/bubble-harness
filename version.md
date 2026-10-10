# Version 記錄

本檔追蹤 bubble-harness 的版本狀態與出貨時間點。

## 當前版本

**0.2.0**（2026-10-10）

## 版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 0.2.0 | 2026-10-10 | Sandbox 邊界：guest 跑 loop，host 經 JSON port 執行有權限呼叫 |
| 0.1.0 | 2026-10-10 | 最小 agent loop、system tools、宿主 tools、OpenRouter `callModel` |

---

## 版本規則

- **X.Y.Z** 格式：major.minor.patch
- **Patch**（Z）僅給 bugfix；新功能走下一個 **minor**
- 版本號與 `package.json` 的 `version` 欄位同步
- 每次出貨更新本檔與 [changelog.md](changelog.md)

# 0.2.0 — reasoning

← [INDEX.md](./INDEX.md)

- **Guest 跑 loop、host 持權限：** 隔離環境不該碰到 KV 實作、網路或 API key。把 loop 留在 guest，才能沿用 0.1.0 的 messages 主線與 memory，而不把 `Map` 或函式送過邊界。
- **抽象 port 而非 Chrome API：** 函式庫若 import `chrome` 就綁死擴充功能。宿主用自己的 `postMessage` 實作 `SandboxPort` 即可。本版用進程內配對測契約，不測瀏覽器。
- **JSON 往返：** structured clone 仍可能帶走非資料物件。強制 `JSON.parse(JSON.stringify(...))` 讓契約只剩資料，避免 guest 拿到 host 的函式。
- **不另做 sessionId：** 0.1.0 已由呼叫端持有 messages。一條 port 對一個 guest harness 就夠；再加 session 欄位會變成第二套生命週期，而宿主還沒有持久化需求寫進本版。
- **不在本版做逾時：** 逾時秒數沒有產品數字。掛起優於猜測一個秒數並把慢的 `callModel` 當成失敗。
- **`close` 是一筆 JSON 訊息：** 只在 host 進程 reject Promise 無法叫醒另一個進程的 guest。關閉必須走 port，測試也應讓 guest 依訊息失敗，而不是與 host 共用一個 pending map。
- **Allowlist 不是對抗惡意 guest 的邊界：** 檢查發生在 guest 的 `executeSystemTool`，與 0.1.0 相同，用來約束遵循本函式庫的 loop。改過程式、直接 `postMessage` 一筆 `fetch` 的 guest 可以跳過它。本版不把 host 再設一層 allowlist 當契約；宿主若要擋，在自己的 `fetchImpl` 拒絕即可。

# 0.2.0 — HOW（sandbox 契約）

← [INDEX.md](./INDEX.md)

## 訊息

請求（guest → host）：

```ts
type SandboxOp = 'kv.get' | 'kv.set' | 'fetch' | 'callModel' | 'hostTool';

interface SandboxRequest {
  kind: 'bubble-harness.sandbox';
  id: string;
  op: SandboxOp;
  payload: unknown;
}
```

關閉（host → guest）：

```ts
interface SandboxClose {
  kind: 'bubble-harness.sandbox.close';
}
```

沒有 `id`。Guest 收到後拒絕每筆尚未配對的請求。

回應（host → guest）：

```ts
interface SandboxResponse {
  kind: 'bubble-harness.sandbox.result';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}
```

`id` 由 guest 產生，同一條連線內不重複。Host 原樣帶回。

處理規則：

- 對單筆訊息做 `JSON.parse(JSON.stringify(data))` 若拋錯（例如訊息本身是 `undefined`，或物件含循環參照），**忽略該筆**，不要讓 listener 拋出。
- 序列化結果若不是非 null 物件（`null`、數字、字串、陣列），**忽略**。不要讀 `kind` 而拋錯。
- 回應的 `id` 對不到掛起請求：**忽略**。
- `ok: false` 且沒有字串 `error`：guest reject `Error('Sandbox request failed')`。
- `ok: true` 時回應物件 **一定有** `result` 鍵。`kv.get` 找不到時 `result` 為 JSON `null`，不得省略該鍵（省略會變成 `undefined`，偏離 0.1.0 的 `string | null`）。

### payload

| op | payload | 成功時 `result` |
|----|---------|-----------------|
| `kv.get` | `{ key: string }` | `string \| null` |
| `kv.set` | `{ key: string, value: string }` | `{ ok: true }` |
| `fetch` | `{ url, method?, headers?, body? }`（與 0.1.0 `FetchRequest` 相同） | `{ status: number, body: string }` |
| `callModel` | `CallModelRequest` | `CallModelResult` |
| `hostTool` | `{ name: string, args: Record<string, unknown> }` | `execute` 的回傳值（須可 JSON 序列化） |

Host 收到無法 JSON 序列化的 `result` 時，回 `{ ok: false, error: "Result is not JSON-serializable" }`。

未知 `op`、未知 host tool 名稱、handler throw：`{ ok: false, error: <message> }`。不要讓 host 的例外冒出 port 以外。

## Guest

`createSandboxGuest` 內部呼叫 `createHarness`。因此 0.1.0 的名稱檢查仍然有效：`hostToolSchemas` 與 system tool 同名、或 schema 名稱重複時，`createHarness` **throw**，不改成 port 錯誤。

- `kvStore.get`／`set` → `kv.get`／`kv.set`
- `fetchImpl` → `fetch`（allowlist 仍由 `executeSystemTool` 在送出前檢查）
- `callModel` → `callModel`
- 每個 `hostToolSchemas` 項目註冊一個 `execute`，送 `hostTool`

Guest 送請求的順序固定：先把 `id` 登記成掛起的 Promise，再 `postMessage`。進程內配對是同步呼叫對方 listener；若先送再登記，host 的回應會因對不到 `id` 被忽略，該請求會一直掛著。

等待回應的 Promise：`ok: true` 時 resolve `result`（鍵必須存在）；`ok: false` 時 reject `Error(error)`，缺 `error` 則用 `Sandbox request failed`。`callModel` 的 reject 直接傳出 loop。其餘 tool 的 reject 由既有 loop catch，寫成 tool content。

收到 `bubble-harness.sandbox.close`：已掛起的 Promise reject `Error('Sandbox port closed')`，然後解除 guest 訂閱。其後才抵達的回應忽略。

## Host

`createSandboxHost` 只處理 `kind === 'bubble-harness.sandbox'` 的物件。每個請求在回應送出前都 await handler。`fetchImpl` 省略時使用與 0.1.0 相同的預設 `fetch` 包裝（Web `fetch`）。

Host tool 名稱與 guest schema 不一致時：guest 仍可送出該名稱；host 找不到 `execute` 就回錯誤，不執行其他 tool。

## 進程內配對

`createInProcessSandboxPorts` 的兩端 `postMessage` 以同步方式呼叫對方目前的 listeners（同一 turn）。解除訂閱後該 listener 不再被呼叫。

## 禁止

- `src/` import `chrome` 或錢包模組。
- 在 port payload 放 API key、密碼、私鑰。
- 為了 sandbox 改寫 `runAgentLoop` 的 `stopReason`、截斷或 structured tool error 語意。

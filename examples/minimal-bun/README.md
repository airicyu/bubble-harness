# minimal-bun

Bun 可直接執行 TypeScript。預設打真實 OpenRouter；`--mock` 才用假 LLM。

## Live（預設）

倉庫根 `.env`（gitignore）填入 key，Bun 會自動載入：

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=deepseek/deepseek-chat
```

```bash
bun examples/minimal-bun/run.ts
```

或：`bun run example`

## Mock（無 API key）

```bash
bun examples/minimal-bun/run.ts --mock
```

加 `--trace` 可經 `onEvent` 印出 step／assistant／tool（由 example 控制；API key 不會進事件）。

Key 僅由 example 從 `Bun.env` 讀取並傳入 `createOpenRouterCallModel`；library 本身不讀 env。

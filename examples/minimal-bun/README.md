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

Key 僅由 example 從 `Bun.env` 讀取並傳入 `createOpenRouterCallModel`；library 本身不讀 env。

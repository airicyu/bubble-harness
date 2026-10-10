# minimal-node

在 Node 18+ 執行最小 harness loop。

## Mock（無 API key）

```bash
npm run build
node examples/minimal-node/run.mjs
```

## Live OpenRouter

```bash
export OPENROUTER_API_KEY='your-key-here'
# 可選：export OPENROUTER_MODEL='openai/gpt-4o-mini'
node examples/minimal-node/run.mjs --live
```

Key 僅由 example 從環境變數讀取並傳入 `createOpenRouterCallModel`；library 本身不讀 env。

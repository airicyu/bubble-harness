# 0.1.0 — reasoning（簡）

← [INDEX.md](./INDEX.md)

- **Node 先跑通**：Chrome sandbox 需額外 bridge，不阻塞 library 契約驗證。
- **OpenRouter 當 LLM 機制而非 tool**：與「query-only、宿主代打 key」一致；避免模型把「叫 LLM」當成可與 `fetch` 並列的業務 tool。
- **Structured tool errors**：簽名風險等場景需要模型在失敗後繼續推理；throw 會中斷整條 transcript。
- **8KB 截斷**：對齊 brainstorm，防止單次 RPC／fetch 撐爆 context。
- **單一 messages 主線**：對齊 OpenRouter／pi-agent 慣例，利於日後 host 持久化同一 session。

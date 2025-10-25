# Running an MCP

```bash
FASTMCP_LOG_LEVEL=DEBUG \
uvx mcp-proxy \
  --host 0.0.0.0  \
  --port 8002 \
  --allow-origin '*' \
  -- sh -c "TMDB_API_KEY=$TMDB_API_KEY node dist/index.js"
```

```bash
HOST=0.0.0.0 DANGEROUSLY_OMIT_AUTH=true \
npx @modelcontextprotocol/inspector
```


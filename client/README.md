# MockMateAI Client

React/Vite client for MockMateAI. The root [README](../README.md) is the
authoritative setup and workflow guide.

## Local commands

Run these commands from the repository root:

```bash
npm run dev:client
npm run build
npm test --workspace=client
```

The client calls `VITE_API_BASE_URL`, which defaults to
`http://localhost:4444/api`. It must never contain backend credentials,
database URIs, or AI-provider keys.

For current implementation status and approved work, read
[`project_memory/IMPLEMENTATION_STATUS.md`](../project_memory/IMPLEMENTATION_STATUS.md).

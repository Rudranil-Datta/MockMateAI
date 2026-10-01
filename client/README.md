# MockMateAI Client

React/Vite client for MockMateAI. Use the root [README](../README.md) for the
public project overview and demo setup. Team members must use the
[development guide](../DEVELOPMENT_GUIDE.md) for Git workflow, private
environment-file placement, Codex usage, and contribution checks.

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

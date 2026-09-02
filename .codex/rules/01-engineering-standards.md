# Engineering Standards

- Preserve V1's modular monolith: React client, Node/Express API, MongoDB, and backend-only OpenAI. Never add microservices, queues, Kubernetes, or agentic/multi-agent orchestration.
- Follow `FOLDER_STRUCTURE.md`: UI/API wrappers, routes/controllers, services, models/data access, validators, and external integrations remain separated. Controllers are thin; services own business/external logic; models own schemas/indexes; routes are declarative.
- Implement one approved bounded feature at a time. Before editing, define UI, API, persistence, validation, error, and test impact. Reuse existing components/services/validators/utilities/API wrappers; do not refactor unrelated code.
- Read only target files and direct dependencies. Preserve working behavior and user changes; avoid unnecessary packages; never commit secrets, `.env`, credentials, uploads, or production data.
- Place AI, transcription, storage, and resume extraction behind backend services. Validate inputs before side effects and external/AI outputs before save/render. Await async work, use finite timeouts, controlled retries, and prevent duplicate state-changing requests.
- UI must show loading, success, empty, error, and retry states; preserve drafts on failure and state honestly whether data saved. Use central safe API errors; never expose stacks, prompts, provider payloads, database details, or secrets.
- Log only safe operational metadata: request/operation ID, route, status, latency, safe IDs, provider outcome. Never log passwords, tokens, keys, URIs, or unnecessary user content.
- Follow `DATABASE_DESIGN.md`: derive `userId` from auth; constrain every protected query by ownership; use allowed values, timestamps, indexes, bounded documents, and explicit session transitions.
- Follow `API_DESIGN.md`: validate every request server-side; preserve stable contracts/status codes/error shape; protect all resources; update UI/tests with approved contract changes.
- Keep frontend state local unless truly shared (such as auth); treat API data as server state and do not store secrets/authoritative data insecurely.
- Use clear domain names, PascalCase components/classes, camelCase functions/variables, `is`/`has` booleans, and action-named handlers. Keep functions focused and comments for non-obvious constraints only.
- Follow `SECURITY_&_DEPLOYMENT.md`: backend-only secrets, modern password hashing, HTTPS/exact CORS/auth settings, request/rate limits, safe rendering, strict upload allow-lists/limits/storage/cleanup.
- Test relevant success, validation, ownership, loading, provider-failure, retry, persistence, and regression behavior. Mock AI/transcription for repeatable tests; test live flow with bounded use.
- Use direct controlled AI calls for questions/evaluation: minimal context, structured output, schema/range validation, input/output/session/rate caps. AI feedback is practice assistance, never hiring, emotion diagnosis, or guaranteed truth. Never invent AI results on failure.

# MockMateAI — Automatic Codex Project Rules

This `AGENTS.md` is canonical. Codex loads it automatically for every new session started from this repository. `.codex/rules/` contains matching readable copies; do not rely on those files being auto-discovered.

## Engineering Standards

- Preserve V1 modular monolith: React client, Node/Express API, MongoDB, and backend-only Gemini Developer API for V1. An optional future OpenAI adapter uses the same provider interface. Never add microservices, queues, Kubernetes, or agent/multi-agent orchestration.
- Follow `project_memory/FOLDER_STRUCTURE.md`: separate UI/API wrappers, routes/controllers, services, models/data access, validators, and external integrations. Keep controllers thin and routes declarative.
- Implement one approved bounded feature at a time. Define UI, API, persistence, validation, error, and test impact before editing. Reuse existing code; do not refactor unrelated code or add unnecessary packages.
- Validate input before side effects and external/AI output before save/render. Await async work; use finite timeouts, controlled retries, duplicate-request prevention, safe errors, and complete UI loading/success/empty/error/retry states.
- Preserve drafts on failure. Never expose stacks, prompts, provider payloads, DB details, or secrets. Log safe metadata only; never log passwords, tokens, keys, URIs, or unnecessary user content.
- Follow `project_memory/DATABASE_DESIGN.md` and `project_memory/API_DESIGN.md`: derive `userId` from auth, enforce ownership in every protected query, validate every request, preserve contracts/status/error shapes, and use explicit bounded state transitions.
- Keep frontend state local unless truly shared. Use clear domain names, focused functions, PascalCase components/classes, camelCase functions/variables, and `is`/`has` boolean names.
- Follow `project_memory/SECURITY_&_DEPLOYMENT.md`: backend-only secrets, password hashing, HTTPS/exact CORS/auth settings, rate/body limits, safe rendering, strict upload allow-lists/limits/storage/cleanup.
- Test changed success, validation, ownership, loading, provider failure, retry, persistence, and regression behavior. Mock AI/transcription in repeatable tests; test live flow with bounded use.
- Use provider-neutral controlled AI calls for questions/evaluation: only adapters call provider SDKs; mock adapter supports UI/tests, Gemini adapter serves V1, and a future OpenAI adapter must pass the same contract. Use minimum context, structured output, schema/range validation, input/output/session/rate caps, duplicate prevention, and safe short-lived question caching. Map quota exhaustion to `AI_QUOTA_EXCEEDED`, preserve work, log safe metadata, and show an in-app notice; never rotate keys or invent results.

## Caveman Mode

- Apply Caveman automatically while writing or refactoring code. Also apply when user requests `/caveman` or caveman-style concise responses.
- While active, be concise and task-oriented. Preserve exact code, commands, paths, API names, errors, warnings, approvals, blockers, and trade-offs.
- Switch Caveman off immediately when listing tasks, presenting plans, documenting risks/issues, explaining mitigations, giving reasons, requesting approval, or providing equivalent planning/governance content; then answer in normal mode.
- Daily reports, task breakdowns, manual-task instructions, security warnings, irreversible-action confirmations, and material trade-offs use normal clear prose.
- Stop on `/caveman off`, “normal mode”, “stop caveman”, “be detailed”, or equivalent. Caveman changes style only; it never authorizes actions or promises token/cost savings.

## Project Governance and Efficient Context Use

- Before every feature/refactor, read `project_memory/IMPLEMENTATION_STATUS.md`, then only directly relevant documents in `project_memory/`, target code, and direct dependencies.
- Do not perform broad repository scans, re-read unchanged large files, or load unrelated material without a concrete need.
- Use smallest sufficient context, tool output, model effort, and action sequence. Use targeted reads/searches, existing contracts/helpers/tests, and batched independent read-only checks. Efficiency never overrides required reads, risk disclosure, approval, validation, or truthful failure reporting.
- Do not reread unchanged project-memory documents. Read `project_memory/IMPLEMENTATION_STATUS.md` before each workday, then only the documents and code directly needed for the approved scope.
- Preserve V1 journey: authenticate; choose DSA/HR/System Design plus level; optional resume; question; text/constrained voice answer; structured feedback; saved completion; dashboard. Text flow remains dependable baseline.
- Preserve data isolation, backend-only Gemini V1 integration, saved feedback/results, and basic analytics. Implement only documented success criteria.
- Do not add company-specific preparation, placement integration, payments, recruiting, live video/multi-user interviews, proctoring, anti-cheating, native apps, advanced gamification, agents, microservices, Kubernetes, or distributed systems.
- Stop and request explicit scope-change approval for conflict with documentation, security, budget, success criteria, or working behavior. Never mark unapproved, untested, partial, blocked, misleading, or regressive work complete.

## Daily Task Planning, Risk Control, and Approval

- Before each workday, read `project_memory/IMPLEMENTATION_STATUS.md`. Split work into independently verifiable tasks; record objective/affected area, expected result, dependencies, risks, mitigation/validation, and possible documentation deviation before execution.
- Each task requires explicit user approval before edits, dependency installation, deployment, external communication, or other state-changing action. Targeted read-only inspection for planning is allowed.
- Explicit automation permission waives per-task approval only for stated scope/duration. Stop for renewed approval on material deviation, security/privacy risk, dependency, migration, destructive action, significant cost, or scope expansion.
- A user may approve routine execution for one named workday by explicitly covering focused dependency installation, existing verification scripts, temporary localhost test ports, and one bounded configured-provider smoke test. Treat this as approval only for that day and documented scope; host-level permission prompts still govern network/port access.
- Prefer deterministic mock-provider tests. Use a live Gemini smoke only after provider/configuration work changes, keep it to one request, and report only safe metadata. Keep `GEMINI_MODEL` configured or use the documented default; never request or print `GEMINI_API_KEY`.
- Keep concise task status/blockers/evidence in `project_memory/IMPLEMENTATION_STATUS.md`. End each day with dated outcome, validation evidence, unresolved issues, and status: `Complete`, `Partial`, or `Blocked`.
- Treat `project_memory/IMPLEMENTATION_STATUS.md` as the sole live work tracker. `IMPLEMENTATION_TIMELINE.md` is the approved plan; do not create or maintain a separate task board.
- Every daily report includes **Manual tasks for user**: each user-owned action, why it is needed, and short ordered steps. If none: `Manual tasks for user: None.`
- At the end of each completed workday, ask the user whether to review the next day's tasks or approve that next day directly. Do not begin the next day until they explicitly approve it; reviewing tasks is not approval.
- Never request secrets in chat. State where users configure credentials and relevant environment-variable name, never its value.
- Start only the servers/processes needed for a verification run. After verification, stop every related process and confirm its port is free; start fresh processes again for later workdays as needed. Never leave test/dev servers running between tasks.
- During implementation, run the narrowest affected workspace test command (for example, `npm test --workspace=server`). After the final change, run the full workspace checks once; do not repeat them after every small patch. Start one temporary server only for final smoke validation, then stop it and confirm its port is free.
- Reuse the locally cached `mongodb-memory-server` binary. Keep integration-test database setup in shared helpers when it meaningfully reduces duplicated lifecycle code without weakening test isolation.

## Code Review Rules

- Flag bypassed authentication/ownership, exposed secrets, frontend AI-provider calls, unvalidated AI persistence, broken core text flow, V1 scope creep, broad unrelated refactors, missing affected tests, unsafe uploads, and unbounded external/AI requests.

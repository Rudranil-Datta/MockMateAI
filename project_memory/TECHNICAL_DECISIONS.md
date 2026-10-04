# Day 1 Technical Decisions

## Selected baseline

| Area               | Decision                                                                                                                    | Reason                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Runtime            | Node.js 22.16.0                                                                                                             | Installed LTS-compatible runtime.                                                                               |
| Package manager    | npm 10.9.2                                                                                                                  | Installed and simplest V1 default.                                                                              |
| Frontend           | React with Vite                                                                                                             | Fast, minimal React setup.                                                                                      |
| Backend            | Node.js with Express                                                                                                        | Required project stack.                                                                                         |
| Database           | MongoDB Atlas for development/deployment                                                                                    | Managed option; no local database dependency.                                                                   |
| Authentication     | Secure HttpOnly cookie session                                                                                              | Keeps browser credential inaccessible to JavaScript.                                                            |
| Backend testing    | Vitest with Supertest                                                                                                       | Fast unit/integration test path for Node/Express.                                                               |
| Frontend testing   | Vitest with React Testing Library                                                                                           | Matches Vite and component testing needs.                                                                       |
| End-to-end testing | Playwright                                                                                                                  | Covers required full user journey.                                                                              |
| AI provider        | Gemini Developer API for V1, behind an `aiProviderService` interface                                                        | Supports low-cost prototyping and an optional future OpenAI adapter without controller/UI changes.              |
| AI development     | Mock provider first, then Gemini integration                                                                                | Avoids cost/quota blockers before live key setup.                                                               |
| Provider contract  | `generateQuestion(input)` and `evaluateAnswer(input)` return common validated shapes                                        | Keeps SDK/prompt/model differences inside adapters and enables an OpenAI adapter without API/UI/schema changes. |
| Quota preservation | Caps, duplicate prevention, one controlled retry, short-lived compatible question cache, and per-user/IP/application limits | Reduces free-tier consumption without quota circumvention.                                                      |
| Quota notification | `429 AI_QUOTA_EXCEEDED`, immediate in-app notice, and safe server log                                                       | Preserves user work and gives an honest retry path; V1 excludes external alerts and key rotation.               |

## Day 34 Resume Retention Decision

**Status:** Implemented for the approved free-tier topology.

Resume PDFs are temporary processing inputs, not retained application files. The backend stages each bounded upload under `RESUME_UPLOAD_DIR`, validates and extracts it during the request, persists only owned metadata plus validated extracted text in MongoDB, and deletes the raw PDF on success, extraction failure, validation failure, or persistence failure. A failed extraction requires a new upload. Legacy records may retain their old private `storage` field for compatibility, but new records do not write it.

This permits Render's ephemeral `/tmp` storage without a disk or object-store dependency. If raw-resume download or retention is later approved, reopen the decision and introduce private object storage with explicit authorization, deletion, lifecycle, migration, and rollback controls before retaining any new file.

## Resume Extraction Decision

**Status:** Implemented for V1 local PDF extraction.

Use `pdf-parse` on the backend only. Extraction remains synchronous with the bounded upload request but runs in a terminable resource-limited worker. Reject files above 5 MiB or 20 pages, process accepted pages sequentially, stop normalized accumulation at 50,000 characters, and terminate work before reporting the 5-second timeout. Parser crash/resource failures persist a safe `failed` state without exposing text or parser details; the user may re-upload because the raw PDF is always deleted. Question generation receives only an owned completed resume's normalized first 2,000 characters. OCR, cloud document parsing, and client-side extraction remain deferred.

## Answer Evaluation Recovery Decision

**Status:** Implemented for the V1 typed-answer flow.

Each logical answer submission carries a client-generated UUID retained across explicit retry. The backend persists the first accepted answer text, acquires a private 30-second database claim, evaluates only that saved text, and validates provider output before storage. Valid output is staged privately before the final feedback transition so a final-write failure can retry without another provider call. Claim ownership prevents an expired worker from releasing or overwriting a newer evaluation. Completed same-key replay returns the saved result; different-key duplicates are rejected. Internal keys, claim metadata, and staged output never enter API responses.

## Voice Transcription Decision

**Status:** Implemented and verified for Day 27.

Use the existing backend-only Gemini SDK behind a provider-neutral transcription service, with a deterministic mock for routine tests. Authenticate and verify ownership before accepting one bounded temporary audio file. Validate MIME, extension, and signature; make one finite-timeout provider call with no automatic retry; accept only 1–10,000 characters of safe transcript text; and delete raw audio before responding. A private question-level UUID claim prevents duplicate/concurrent cost and stages validated text for Day 28 without creating feedback or a completed answer.

WebM, Ogg, Opus, and ISO-BMFF MP4 remain in the local input contract. The first direct Gemini MP4 smoke returned normalized `TRANSCRIPTION_UNAVAILABLE`; a separately approved 2026-09-27 diagnostic repeated the exact request and produced a bounded transcript. This proves the configured direct MP4 path and indicates the first failure was transient at the provider/network boundary, though its exact upstream status was not retained. Safe error categorization now distinguishes quota, timeout, rejected input, configuration/access, network, upstream availability, and unknown failure without exposing provider details. No FFmpeg, byte relabelling, or conversion dependency is needed.

## Voice Answer Evaluation Decision

**Status:** Implemented for Day 28.

After successful transcription, atomically consume the matching private completed transcript into one immutable `inputMode: "voice"` answer and remove the handoff state. Use the original operation UUID across transcription, answer persistence, evaluation, retry, and replay. Typed and voice answers invoke the same provider-neutral evaluation claim/staging/finalization service and return the same structured feedback contract. Raw audio and `voiceStorageKey` are not retained. Evaluation failure preserves the saved answer; same-key retry skips transcription and reuses validated staged output when available.

## Day 29 Usage-Control Decision

**Status:** Implemented for the single-process V1 modular monolith.

Use a dependency-free bounded in-memory fixed-window limiter at route boundaries. Signup/login use a direct-IP bucket; AI-consuming interview actions use authenticated-user, direct-IP, and application buckets; resume and voice uploads use authenticated-user and direct-IP buckets before multipart parsing. Known reset times return `Retry-After`. Provider quota remains the separate `AI_QUOTA_EXCEEDED` contract.

Configured production defaults are 20 authentication attempts per IP per 15 minutes, 20 AI actions per user and 60 per IP per hour, 200 application AI actions per UTC day, and 10 uploads per user and 30 per IP per hour. Day 34 retained the counters only for one free Render web-service process/instance, with `TRUST_PROXY=render` trusting one proxy hop so the right-most forwarded client address keys IP limits. Counters reset on sleep, restart, or redeploy and are not durable or distributed; externalize them before multiple processes/instances, horizontal scaling, or production-grade enforcement.

Keep the V1 interview limit fixed at five questions and one answer per question. Cache only validated context-free first questions by interview type and level for 60 seconds by default, with a five-minute configuration ceiling. Do not cache feedback, transcription, resume context, or follow-up questions. Keep AI timeout between 1 and 20 seconds and perform zero automatic provider retries; explicit user retry retains existing operation identifiers and remains rate-limited.

## G36-F08 Transient Retry Decision

**Status:** Implemented and verified on deployed commit `7bef53a`.

G36-F08 supersedes the Day 29 zero-automatic-retry rule only for question generation and typed evaluation: retry `provider_unavailable` exactly once after a randomized 500–1,000 ms delay, within the original total timeout, and only when at least 3,000 ms remains after backoff. Voice, quota, timeout, authentication, permission, model-not-found, rejected, invalid-response, and unknown failures remain single-attempt. A final failure retains the explicit user retry with the original operation identifier and outer-request rate-limit accounting. This bounded retry may create a second billed provider call but cannot create an additional outer rate-limit charge, database claim, answer, question, or feedback record.

## Day 34 Free-Tier Hosting Decision

**Status:** Implemented and deployed on Render with MongoDB Atlas.

Use one free Render static site, one free single-process Render Node web service, and the existing MongoDB Atlas free cluster. The static site rewrites `/api/*` to the API and all remaining routes to `index.html`; the browser therefore uses `VITE_API_BASE_URL=/api`. Production startup requires an explicit Atlas database name, exact HTTPS client origin, Render-only proxy mode, strong authentication secret, and absolute ephemeral upload directories. `GET /health` is process-only liveness. `GET /ready` performs a bounded MongoDB ping and returns only `ready` or `unavailable`. Free-service sleep/restart resets caches and counters and can cause cold starts; this topology is approved for demo/staging, not as durable quota enforcement.

## Deferred Decisions

- Production-scale hosting, durable/distributed rate limits, and any fallback AI provider remain post-V1 decisions. V1 uses the approved single-process Render and Atlas demo/staging topology.
- Real-device voice, second-browser authentication, and broader reliability evidence remain Phase 2 work for October 11–13, 2026.

## Constraints

- Use Node 22 or newer compatible packages only.
- No secrets in repository. Use `server/.env` locally and deployment environment variables.
- MongoDB and Gemini credentials remain user-managed manual setup items. OpenAI credentials are not required for V1.

## V2 Decisions

The decision-complete Day 1 contracts—including adaptive enums and transition
rules, immutable evidence ordering, mastery math, compatibility defaults, and
failure sequencing—are recorded in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). Later deviations require explicit
approval.

### Day 2 Job Target lifecycle decision

Job Target analysis uses one owned MongoDB document, an atomic private claim,
and a 30-second stale lease matching existing interview recovery. Analysis is
never cached because JD content is private and input-specific. Mock and Gemini
adapters implement `analyzeJobTarget`; shared validation remains authoritative.
Provider failure records only a safe category and no analysis. Persistence
failure cannot be mislabeled as provider failure or returned as success.

### Bounded adaptive engine

Use deterministic service orchestration around validated provider-neutral
structured outputs. Do not implement autonomous agents, model-invoked tools,
multi-agent coordination, direct model database access, or model-controlled
persistence/state transitions.

Day 4 implements only the structural boundary. The exact provider input is
capped at 1–12 coverage entries, 0–5 prior summaries, 16 KiB context, and 32
KiB total. Both adapters return one exact decision through the shared validator
without unavailable retry. Optional metadata is all-or-valid; complete private
decision staging preserves recovery. V1 generation remains active, while Day 5
retains all branch, similarity, difficulty-step, follow-up, and coverage rules.

### Job and project context

Store owned Job Targets and user-confirmed Candidate Projects in MongoDB.
Resume-assisted extraction returns drafts only. Persist bounded context snapshots
inside sessions so historical replay does not change when source records do.

Day 3 implements Candidate Projects as one owned MongoDB collection plus an
unsaved extraction path. Extraction uses a separate 8,000-character resume
context and a 60-second/100-entry process-local replay and in-flight map keyed
by owner and operation UUID; it is a duplicate/cost control, not persistence.
Provider output is exact-schema validated and labelled `resume_suggestion`.
Literal user confirmation is required for create and full-record patch, and the
server writes/refreshes `confirmedAt`. These fixed privacy and memory caps are
not environment variables because operator expansion could weaken the approved
bounds.

### Skill intelligence

Persist immutable categorical answer evidence and derive mastery in backend
logic using fixed values and bounded difficulty, evidence-strength, recency, and
attempt-confidence rules. Never persist an LLM-provided final mastery score as
authoritative.

### Compatibility and release scope

Add `Role Simulation` and `Project Defense` without changing historical V1
records or the five-question cap. Reuse the existing interview lifecycle for
targeted practice. Defer the visual skill graph, Story Bank, live copilot,
peer/video features, coding sandbox, scraping, payments, placement integration,
and distributed infrastructure beyond the 15-working-day release.

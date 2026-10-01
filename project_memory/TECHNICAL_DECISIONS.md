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

## Future Storage Decision

**Status:** Deferred until deployment architecture is selected; local V1 development remains unchanged.

Resume PDFs currently use private local backend storage configured by `RESUME_UPLOAD_DIR`. That is suitable for a single persistent development backend. Before deploying to an ephemeral, serverless, or multi-instance host, introduce a small storage adapter with `store`, `read`, and `delete` operations and move files to private object storage.

- Prefer an object-storage service such as S3, Cloudflare R2, or Google Cloud Storage for private document retention and lifecycle controls. Cloudinary is an acceptable future option only when its private/authenticated raw-file delivery and deletion controls meet the same requirements.
- Keep the existing stored `provider` and opaque `key` model; do not persist public URLs or user-supplied filenames.
- Keep provider credentials backend-only. Downloads, when required, must remain authorized through the API or use short-lived controlled URLs.
- If files exist at migration time, copy each object, update its provider/key only after a successful copy, verify authorized read/delete behavior, and retain a rollback path until the migration is checked.

This is a deployment/storage concern, not a reason to replace Multer: Multer remains the HTTP multipart parser at the API boundary, while the future adapter decides where accepted files are stored.

## Resume Extraction Decision

**Status:** Implemented for V1 local PDF extraction.

Use `pdf-parse` on the backend only. Extraction remains synchronous with the bounded upload request but runs in a terminable resource-limited worker. Reject files above 5 MiB or 20 pages, process accepted pages sequentially, stop normalized accumulation at 50,000 characters, and terminate work before reporting the 5-second timeout. Parser crash/resource failures persist a recoverable safe `failed` state without exposing text or parser details. Question generation receives only an owned completed resume's normalized first 2,000 characters. OCR, cloud document parsing, and client-side extraction remain deferred.

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

Configured production defaults are 20 authentication attempts per IP per 15 minutes, 20 AI actions per user and 60 per IP per hour, 200 application AI actions per UTC day, and 10 uploads per user and 30 per IP per hour. Counters reset on process restart and are not distributed. Day 34 must revisit this decision if hosting uses multiple API instances or requires trusted-proxy configuration.

Keep the V1 interview limit fixed at five questions and one answer per question. Cache only validated context-free first questions by interview type and level for 60 seconds by default, with a five-minute configuration ceiling. Do not cache feedback, transcription, resume context, or follow-up questions. Keep AI timeout between 1 and 20 seconds and perform zero automatic provider retries; explicit user retry retains existing operation identifiers and remains rate-limited.

## Deferred Decisions

- Hosting provider: decide Week 7.

## Constraints

- Use Node 22 or newer compatible packages only.
- No secrets in repository. Use `server/.env` locally and deployment environment variables.
- MongoDB and Gemini credentials remain user-managed manual setup items. OpenAI credentials are not required for V1.

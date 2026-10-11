# V1 Security & Deployment — AI-Powered Interview Preparation Platform

## Purpose

This document defines the minimum security posture and deployment approach for a two-month, budget-conscious V1. The objective is a reliable demonstration application that protects user accounts and personal documents, keeps secrets off the client, controls AI cost, and fails safely when dependencies are unavailable.

## Deployment Architecture

```text
Browser
  │ HTTPS
  ▼
React frontend (static hosting)
  │ HTTPS REST requests; allowed origin only
  ▼
Node.js + Express API (managed application host)
  ├── MongoDB Atlas or another managed MongoDB instance
  ├── Ephemeral bounded upload staging; raw resume/audio files are deleted
  └── Gemini Developer API (backend-only for V1)
```

Day 34 selects a free Render static site, one free single-process Render web service, and the existing MongoDB Atlas free cluster. Raw resume/audio uploads use bounded ephemeral staging and are deleted before the request finishes. Microservices, queues, containers, Kubernetes, multi-region replication, paid disks, and object storage are not required for this approved demo/staging topology.

## Environment Configuration

Configure secrets through the deployment provider's environment-variable settings. Commit only `.env.example` files, never real `.env` files.

```text
# Required server configuration
NODE_ENV=production
PORT=4444
MONGODB_URI=
MONGODB_DB_NAME=mockmateai
AI_PROVIDER=gemini
GEMINI_API_KEY=
# Optional future provider; leave unset for Gemini-only V1
OPENAI_API_KEY=
AUTH_SECRET=
CLIENT_ORIGIN=https://app.example.com

# Operational limits: choose conservative V1 values and document them
MAX_RESUME_SIZE_BYTES=
RESUME_UPLOAD_DIR=
TRUST_PROXY=direct
MONGODB_READINESS_TIMEOUT_MS=1000
MAX_AUDIO_SIZE_BYTES=
AI_REQUESTS_PER_USER_PER_HOUR=
AI_REQUESTS_PER_IP_PER_HOUR=
AI_REQUESTS_PER_DAY=
AUTH_REQUESTS_PER_IP_PER_15_MINUTES=
UPLOADS_PER_USER_PER_HOUR=
UPLOADS_PER_IP_PER_HOUR=
JSON_BODY_LIMIT_BYTES=
QUESTION_CACHE_TTL_MS=
AI_REQUEST_TIMEOUT_MS=
```

Startup must validate the presence and format of required configuration. In production, the API should refuse to start with a missing database URI, selected AI-provider key, authentication secret of fewer than 32 UTF-8 bytes, or trusted frontend origin.

## Authentication and Access Control

- Hash passwords using a modern password-hashing library such as bcrypt or Argon2. Never store or log a plain-text password.
- For new signup, normalize email before persistence and validate one local
  part, `@`, DNS-style domain labels, and a 2–63-letter final suffix. Keep the
  database unique email index as the final concurrent duplicate-account guard;
  return a safe duplicate-email field error. Syntax validation is not email
  ownership verification.
- New or replacement passwords require 15–72 UTF-8 bytes plus a number or
  punctuation/symbol character. Reject control/format characters and values
  matching normalized account email or name. Do not trim or silently truncate
  passwords; existing stored password hashes remain valid for login.
- Password change requires the authenticated user's current password, exact
  confirmation, and a replacement that differs from the current bcrypt hash.
  Select the hash only inside the password service; never include credentials in
  API output or logs. Reissue only the successful caller's cookie. Independent
  sessions are not revoked until a separately approved session-version design.
- Profile updates derive identity from the verified session and allow-list only
  name, target role, and experience level. Email remains read-only pending the
  separately deferred verification/change feature.
- Use secure, expiring authentication. For cookie sessions, set `HttpOnly`, `Secure`, and an appropriate `SameSite` policy. For token-based auth, keep tokens short-lived and avoid storing long-lived credentials in insecure browser storage.
- Apply authentication middleware to all resume, interview, answer, and analytics routes.
- Enforce authorization in each data query: retrieve/update resources by both resource ID and authenticated `userId`.
- Return `404` or another safe denial response for foreign resources without revealing whether another user's resource exists.
- Resume deletion requires an explicit client confirmation and an authenticated
  owned lookup. Reject it while a `created` or `active` owned interview references
  the resume; preserve completed history and confirmed project facts while only
  detaching optional owned project provenance.
- Password visibility controls are client-only, default to masked, and change
  only the input type. They must never alter password validation, API payloads,
  persistence, logs, or error text.
- Limit login/signup attempts by IP and consider a small per-account delay/lockout after repeated failures. Do not permanently lock users based solely on an IP address.
- Regenerate session identifiers after login where applicable and invalidate server-side sessions on logout if server sessions are used.

## API and Browser Protections

- Require HTTPS in production. Redirect or reject plain HTTP at the hosting/proxy layer.
- Allow CORS only from the exact configured frontend origin; do not use `*` with authenticated requests.
- Set a conservative request-body size limit for JSON endpoints.
- Use security headers, including Content Security Policy appropriate to the deployed UI, `X-Content-Type-Options: nosniff`, clickjacking protection (`frame-ancestors` or equivalent), and `Referrer-Policy`.
- Validate every request server-side using allow-lists for interview type, level, IDs, and input shapes. Client-side validation only improves usability; it is not a security control.
- Sanitize or safely render user-entered/AI-generated text. Never inject it into HTML with unsafe rendering APIs.
- Return generic safe error messages to clients and log internal details only on the server with secrets redacted.
- Use dependency lockfiles and regularly run the package manager's security audit as part of development/release checks.

## Upload Security

Resume and voice uploads are the highest-risk V1 input path. Apply all of the following before processing:

- Require an authenticated user and rate-limit uploads.
- Enforce a small, documented maximum file size. Do not buffer unlimited uploads in memory.
- Allow only explicitly supported MIME types and verify file signatures/content where practical; do not trust file extensions alone.
- Generate server-side storage names. Never use a user-provided filename as a filesystem path or object-storage key.
- Store uploads outside the public web root; serve them only through authorized access or time-limited controlled URLs if they must be retrievable.
- Reject archives, executables, macro-enabled formats, and unsupported document/audio types for V1.
- Extract PDF text locally with `pdf-parse` inside a resource-limited worker. Reject files above 5 MiB or 20 pages, process accepted pages sequentially, and stop normalized accumulation at 50,000 characters. At the 5-second deadline, terminate the worker before reporting timeout. Treat malformed, password-protected, image-only, empty-text, crashed, and resource-exhausted parsing as controlled recoverable failures; OCR and cloud parsing remain out of scope.
- Delete temporary upload files after processing, including error paths.
- Retain raw audio only if required for a stated feature; the lowest-risk V1 option is to retain the transcription and discard raw audio after processing.

Day 27 implements voice upload as a private temporary-file boundary: authenticate and verify the owned active interview before multipart parsing; accept one 5 MiB-or-smaller WebM, Ogg, Opus, or ISO-BMFF MP4 candidate only when MIME, extension, and signature agree; generate the storage name; and delete the raw file before returning success or error. Transcription uses one finite-timeout backend provider request with no automatic retry. Only a 1–10,000-character validated transcript and private operation state may remain. A separately approved exact-request diagnostic on 2026-09-27 produced a bounded transcript and proved direct configured-provider MP4 compatibility after the first normalized failure. Safe error categories distinguish quota, timeout, rejected input, configuration/access, network, upstream availability, and unknown failures without retaining provider messages, payloads, credentials, or content. No conversion runtime is required.

Day 28 atomically consumes the matching completed transcript into one immutable voice answer, removes the private transcript handoff, and evaluates only the saved text through the same bounded provider-neutral service used for typed answers. Raw audio, temporary paths, and `voiceStorageKey` remain unpersisted. Same-key retry reuses the saved answer and any validated staged feedback without retranscription; ownership, active-session, question, operation-key, and claim-owner filters guard every transition.

### Resume Storage Migration Trigger

`RESUME_UPLOAD_DIR` is temporary private staging. New uploads persist only safe metadata and validated extracted text in MongoDB, then delete the raw PDF on success or failure. Existing legacy `storage` metadata remains readable but is not written by new uploads. Any later raw-file retention feature requires an approved private object-storage design before implementation.

## Gemini Integration and Cost Controls

Gemini is the V1 external AI provider, not a source of trusted application data. A future OpenAI adapter must conform to the same service interface, security controls, and response validation.

- Create the Gemini client in the backend only; never send its key to the frontend or expose it in a build artifact.
- Use a service layer that permits only the intended operations: question generation, answer evaluation, and approved transcription if used.
- Send the minimum context required: selected type/level, current question, submitted answer, and at most a deterministic normalized 2,000-character owned-resume excerpt. Do not send complete resumes or all historical answers by default.
- Require structured output and validate it before database writes or UI rendering. Reject missing fields, wrong types, and out-of-range scores.
- Enforce a maximum prompt/input size and a maximum completion/output size. Truncate only with deliberate, documented handling so prompts remain coherent.
- Cap questions per session. Require client operation UUIDs plus bounded database-backed generation claims so repeated, concurrent, or replayed start/next-question requests do not multiply provider calls or persisted questions. Recover stale claims after the documented lease; never expose claim metadata to clients.
- Day 29 rate-limits AI-consuming routes to 20 authenticated-user requests per hour and 60 direct-IP requests per hour. A 200-request application cap resets at UTC midnight. `AI_RATE_LIMITED` is distinct from provider-originated `AI_QUOTA_EXCEEDED`, and includes `Retry-After` while its reset is known.
- Use a deterministic mock provider for UI development and automated tests, so routine development does not consume live Gemini quota.
- Cache generated questions for 60 seconds by default, configurable up to five minutes, only when type/level compatibility is safe and no resume context or previous question exists. Never cache or share answer feedback, transcription, or resume content between users.
- Day 29 tracks per-user, direct-IP, and application request counts in bounded process memory without logging prompt or answer content. Day 34 retains this only for one free Render process/instance and trusts exactly one Render proxy hop. Counters reset on sleep, restart, or redeploy and are not durable or shared; externalize them before scaling or production-grade quota enforcement.
- Set `AI_REQUEST_TIMEOUT_MS` to a positive value no greater than 20,000 ms, below the 30-second generation/evaluation recovery lease; production uses 20,000 ms. This is one total provider-operation budget, not a per-attempt budget. On timeout, provider error, quota exhaustion, or malformed output, return a retryable state—never invented feedback.
- Question generation and typed evaluation retry exactly once only after `provider_unavailable`, with randomized 500–1,000 ms backoff and at least 3,000 ms required for the second attempt. The second adapter deadline receives only the remaining total budget. Voice and every other provider category remain single-attempt. The UI keeps one pending action; only final failure asks the user to retry. The retry stays inside the original claim/idempotency boundary and counts as one outer rate-limited request, but may create a second billed provider call.
- On quota exhaustion, normalize the provider error to `429 AI_QUOTA_EXCEEDED`, preserve session state, log safe quota metadata, and show the active user an immediate in-app notification. V1 does not send external owner alerts or rotate keys/projects.
- Signup and login allow 20 attempts per direct IP per 15 minutes. Resume and voice uploads allow 10 attempts per authenticated user and 30 per direct IP per hour. Rate-limited uploads are rejected before multipart parsing or disk writes.
- Standard JSON bodies are limited to 100 KiB. Resume and voice multipart bodies keep their independent 5 MiB file ceilings and strict field/file-count limits.
- V1 keeps a fixed five-question session cap and one answer per question. This is an application invariant, not a deployment-tunable environment value, so server and client progression remain consistent.
- Gemini free-tier use may have lower quotas and different data handling than paid tiers. Use synthetic resumes during development or obtain explicit consent before sending a real resume; never send a complete resume where a short relevant excerpt suffices.
- Do not switch providers immediately before deployment. Test the configured Gemini implementation, including malformed output, quota, timeout, and JSON validation behavior, on the environment used for the demo.

## Limits and Constraints That Can Break the Application

| Risk or constraint                               | Failure mode                                                           | Required mitigation                                                                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini free-tier quota, billing limit, or outage | Questions/evaluation cannot be generated.                              | Return `AI_QUOTA_EXCEEDED`, preserve user work, show in-app retry-later notice, log safe event, and use a small curated fallback question set only if explicitly implemented and labelled. |
| AI latency or timeout                            | UI appears stuck; request may be duplicated by repeated clicks.        | Loading state, request timeout, retained client operation UUID, private 30-second owned evaluation claim, stale recovery, and duplicate-submit disabling.                                  |
| Malformed AI response                            | UI/data persistence breaks or invalid scores are saved.                | Schema-validate response; reject invalid output; preserve session in recoverable state.                                                                                                    |
| High API usage / abuse                           | Budget is exhausted or provider rate limits are hit.                   | Per-user/IP limits, session question caps, daily budget monitoring, authentication on all AI routes.                                                                                       |
| Large/hostile file upload                        | Memory exhaustion, disk fill, parser crash, or path traversal.         | Size/type limits, streaming uploads, controlled filenames, isolated storage, parser timeouts, cleanup.                                                                                     |
| Resume extraction failure                        | Question context unavailable.                                          | Save controlled extraction status; let user continue without resume context or retry upload.                                                                                               |
| Voice transcription failure                      | Voice path cannot produce feedback.                                    | Present transcript/retry error; keep typed answer as dependable fallback.                                                                                                                  |
| MongoDB outage or bad connection string          | Login, persistence, sessions, and dashboard fail.                      | Validate config at startup; health check; safe error state; managed backups; do not claim saves succeeded.                                                                                 |
| MongoDB free-tier connection/storage limits      | Intermittent connection failure or capacity exhaustion.                | Use connection pooling, retain minimal data, set upload retention, monitor provider limits before demo.                                                                                    |
| Incorrect CORS/cookie settings                   | Browser rejects authenticated requests.                                | Configure exact production origin, HTTPS, credentials policy, and test deployed login—not just localhost.                                                                                  |
| Expired/misconfigured authentication secret      | All sessions may be invalidated or insecure.                           | Store securely, use strong stable production secret, rotate deliberately with a migration/logout plan.                                                                                     |
| Static-host SPA routing                          | Refreshing a client route returns 404.                                 | Configure host rewrite/fallback to the React entry point and test direct navigation/refresh.                                                                                               |
| Deployment sleep/cold start                      | First API call is slow; demo can time out.                             | Use a host appropriate for demo needs; warm/test the app before presentation; show loading states.                                                                                         |
| Environment-variable mismatch                    | Deployed app starts but cannot reach client, DB, or Gemini.            | Validate selected provider configuration at startup; maintain `.env.example`; perform a deployed smoke test.                                                                               |
| Unbounded MongoDB documents                      | Large sessions eventually exceed limits or slow reads.                 | Cap question/answer counts and response sizes; retain only necessary data.                                                                                                                 |
| Browser microphone permissions                   | Voice recording is unavailable.                                        | Request permission contextually; explain requirement; typed answer remains fully supported.                                                                                                |
| Unsupported browser/audio codec                  | Upload/transcription fails for some users.                             | Document supported browsers/codecs; validate client/server format; provide typed fallback.                                                                                                 |
| Concurrent requests                              | Duplicate answers, provider calls, questions, or completion summaries. | Use status checks, idempotency keys/unique operation IDs, claim-owner checks, durable validated output before final writes, and atomic updates where needed.                               |

## Availability and Safe Failure Behaviour

- Keep `GET /health` as a liveness check that reports basic API-process availability without testing dependencies or exposing internals.
- Use `GET /ready` for dependency readiness. It performs a bounded MongoDB ping, returns safe `200 ready` or `503 unavailable`, and never exposes connection strings, hostnames, credentials, driver errors, or topology details. Render health checks target `/ready`.
- Treat MongoDB persistence as mandatory for operations that claim to create, answer, or complete a session. If saving fails, return failure rather than a misleading success response.
- Make text input and evaluation the primary, best-tested path. Voice and resume enrichment must not block a user from completing a text-based interview.
- Preserve an active session when a question/evaluation call fails so the user can retry rather than start over.
- Display clear loading, retry, and fallback states in the UI. Do not leave indefinite spinners.
- Before a live demo, test sign-in, one question, one typed evaluation, dashboard history, resume upload, and voice capability on the actual deployed URL and browser.

Final V1 handoff proved deployed sign-in, resume-aware question generation, one
typed evaluation, result refresh, dashboard history, logout/login persistence,
and owner-consistent Atlas metadata on the primary Chrome path. Real-device
voice capability, second-browser authentication, and broader reliability remain
approved Phase 2 evidence for October 11–13, 2026. The V1 release claim is
therefore demo/staging scope, with typed practice as the dependable baseline.

## Logging, Monitoring, and Backups

- Log one terminal event per request with request ID, query-free full route, status, rounded latency, public error code on failure, and allow-listed provider category when present. Capture the route before router mutation; never emit both completion and failure entries for one handled failure.
- Never log passwords, auth tokens, Gemini/OpenAI keys, database URIs, full resume text, or full answer text by default.
- Configure error monitoring or at minimum managed-host logs, and review failures during development.
- Monitor AI requests, errors, timeouts, database connection errors, and storage usage against the chosen provider limits.
- Enable managed MongoDB backups where the selected plan supports them. For a student V1, export/seed non-sensitive demo data before important presentations.

## Deployment Checklist

- [x] Production environment variables are configured and validated at startup.
- [x] `.env`, secrets, upload directories, and build output are ignored by version control as appropriate.
- [x] Database network access is restricted to the deployed backend where the provider supports it.
- [x] CORS, HTTPS, cookie/token settings, and frontend API base URL work on the deployed domains.
- [x] Rate limits, body limits, upload limits, AI timeouts, and fixed question/session caps are enabled in application configuration. Deployed proxy/IP behavior remains a Day 34 check.
- [x] Error handler returns safe, consistent API errors; unexpected stack traces are hidden from users.
- [x] Frontend SPA rewrite, backend liveness health endpoint, and separate MongoDB-aware readiness endpoint are configured and verified on the selected host during Day 34.
- [x] A deployed smoke test covers the complete text flow and dashboard persistence.
- [x] Resume/voice failures, AI outage, and expired login each show clear recovery behavior through deployed or deterministic evidence; broader device/browser proof remains Phase 2.

## V1 Non-Goals

This release does not require enterprise SSO, audit-grade compliance, multi-region failover, distributed tracing, complex secret rotation automation, malware scanning infrastructure, or formal certification. Those are later-stage concerns; the controls above are the minimum practical baseline for this project's data and external AI dependency.

## V2 Security and Deployment Additions

Exact Day 1 field/context caps, ownership behavior, provider budget, log
allow-list, retention boundary, and single-process scaling trigger are frozen in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). They add no deployment authority.

Day 2 Job Target routes now enforce auth-derived ownership, exact input/output
bounds, existing JSON and AI rate/daily limits, one total provider timeout, one
provider operation per claim, metadata-only errors/logs, and no JD analysis
cache. Private claim fields never enter API responses. No environment,
dependency, topology, deployment, or credential change was required.

Day 3 Candidate Project routes enforce the same ownership and safe-error
boundary. Project extraction sends only an owned completed resume excerpt capped
at 8,000 normalized characters, performs one validated provider operation, and
keeps up to 100 private results/in-flight claims for 60 seconds in process
memory. Drafts, resume text, prompts, and provider payloads are not logged or
persisted before confirmation. Confirmed facts are capped at 16 KiB. These are
fixed code safety invariants: `render.yaml`, both real/example environment
files, dependencies, topology, and credentials require no Day 3 change.

Day 4 adaptive provider input is exact and capped: 1–12 coverage entries, 0–5
prior summaries, 16 KiB confirmed-context summary, and 32 KiB normalized total.
Output is exact-schema and coverage-membership validated before staging or
rendering. The dormant operation makes one bounded provider call, performs no
unavailable retry, exposes no private claim data, and grants the model no tools
or state authority. No `.env`, example environment, `render.yaml`, dependency,
topology, credential, or deployment change was required.

Day 5 derives outcome from validated scores and rejects provider attempts to
change deterministic branch, reason, parent, selected coverage topic, allowed
difficulty, or topic skill membership. Repeated prompts at normalized
similarity `>=0.85`, exhausted single-topic sequences, and sixth-question
attempts fail safely. The service performs at most one existing bounded
provider operation and writes no state. No `.env`, example environment,
`render.yaml`, dependency, topology, credential, or deployment change was
required.

Day 6 reads Job Targets only through an auth-derived owner filter and accepts
only `ready` analysis. Role Simulation stores a <=16 KiB analysis-only snapshot;
raw JD description and provider payload never enter the session or adaptive
context. Same-key replay uses that snapshot without rereading the source. The
existing bounded provider timeout/rate limits and session claim/staging path are
reused. No `.env`, example environment, `render.yaml`, dependency, topology,
credential, or deployment change was required.

Day 7 reads Candidate Projects only through an auth-derived owner filter and
requires persisted confirmation plus full current fact validation. Project
Defense stores a <=16 KiB facts-only snapshot; extracted drafts, raw resume
text, source resume ID, confirmation time, provider payload, and database
metadata remain excluded. Existing rate/timeout and claim/staging controls are
reused. No `.env`, example environment, `render.yaml`, dependency, topology,
credential, or deployment change was required.

Day 8 never rereads a source Project. Its directive uses one confirmed anchor
from the owned immutable session snapshot and at most 2,000 characters of the
latest saved answer. Provider output must echo safe axis/key metadata and quote
the anchor before staging. Anchor and answer text are never logged or duplicated
in question metadata. Existing timeout, rate, quota, claim, retry, 16 KiB
context, and 32 KiB input controls remain. No `.env`, example environment,
`render.yaml`, dependency, topology, credential, or deployment change was
required.

- Treat JDs, project facts, skill evidence, answers, and replay data as private
  user content. Derive identity from auth and include `userId` in every protected
  query/mutation.
- Send only bounded relevant confirmed context to the selected backend provider.
  Never log JD/resume/project/answer text, prompts, provider payloads,
  chain-of-thought, credentials, or database details.
- AI-extracted Project drafts are untrusted and unusable until the user confirms
  them. Validate every adaptive decision and evidence object before save/render.
- Apply existing authentication, exact CORS/cookie, JSON/body, rate, daily AI,
  timeout/retry, idempotency, request-log, and safe-error controls to every new
  route. Define specific finite bounds during the owning approved day.
- Preserve the single-process demo/staging topology for the 15-day plan. Durable
  distributed limits, additional services, and production-scale availability
  require a separately approved architecture change.
- Day 15 may use one bounded synthetic deployed V2 journey only after explicit
  external-operation approval and deterministic release checks. No planning
  document authorizes provider calls or deployment by itself.

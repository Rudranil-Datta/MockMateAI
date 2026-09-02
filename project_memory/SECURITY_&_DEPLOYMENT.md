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
  ├── Controlled file/object storage for approved resumes/audio, if retained
  └── OpenAI API (backend-only)
```

Use a separate deployment for the frontend and backend, with a managed MongoDB service. A single backend process/application is enough for V1; microservices, queues, containers, Kubernetes, and multi-region replication are not required.

## Environment Configuration

Configure secrets through the deployment provider's environment-variable settings. Commit only `.env.example` files, never real `.env` files.

```text
# Required server configuration
NODE_ENV=production
PORT=5000
MONGODB_URI=
OPENAI_API_KEY=
AUTH_SECRET=
CLIENT_ORIGIN=https://app.example.com

# Operational limits: choose conservative V1 values and document them
MAX_RESUME_SIZE_BYTES=
MAX_AUDIO_SIZE_BYTES=
MAX_QUESTIONS_PER_SESSION=
AI_REQUESTS_PER_USER_PER_HOUR=
AUTH_REQUESTS_PER_IP_PER_15_MINUTES=
UPLOADS_PER_USER_PER_HOUR=
AI_REQUEST_TIMEOUT_MS=
```

Startup must validate the presence and format of required configuration. In production, the API should refuse to start with a missing database URI, OpenAI key, authentication secret, or trusted frontend origin.

## Authentication and Access Control

- Hash passwords using a modern password-hashing library such as bcrypt or Argon2. Never store or log a plain-text password.
- Use secure, expiring authentication. For cookie sessions, set `HttpOnly`, `Secure`, and an appropriate `SameSite` policy. For token-based auth, keep tokens short-lived and avoid storing long-lived credentials in insecure browser storage.
- Apply authentication middleware to all resume, interview, answer, and analytics routes.
- Enforce authorization in each data query: retrieve/update resources by both resource ID and authenticated `userId`.
- Return `404` or another safe denial response for foreign resources without revealing whether another user's resource exists.
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
- Extract text/transcribe with timeouts and resource limits. Treat malformed or password-protected documents as controlled failures.
- Delete temporary upload files after processing, including error paths.
- Retain raw audio only if required for a stated feature; the lowest-risk V1 option is to retain the transcription and discard raw audio after processing.

## OpenAI Integration and Cost Controls

OpenAI is an external dependency, not a source of trusted application data.

- Create the OpenAI client in the backend only; never send its key to the frontend or expose it in a build artifact.
- Use a service layer that permits only the intended operations: question generation, answer evaluation, and approved transcription if used.
- Send the minimum context required: selected type/level, current question, submitted answer, and short relevant resume/session excerpts. Do not send complete resumes or all historical answers by default.
- Require structured output and validate it before database writes or UI rendering. Reject missing fields, wrong types, and out-of-range scores.
- Enforce a maximum prompt/input size and a maximum completion/output size. Truncate only with deliberate, documented handling so prompts remain coherent.
- Cap questions per session; prevent repeated clicks/retries from creating duplicate questions or evaluations.
- Rate-limit AI-consuming routes by authenticated user and by IP. Use a conservative initial allowance, such as a small number of evaluations per hour, then adjust from real usage and budget.
- Track per-user and total request counts/cost indicators without logging sensitive prompt content unnecessarily. Add an application-wide circuit breaker or daily development budget cap when feasible.
- Set a finite AI timeout. On timeout, provider error, quota exhaustion, or malformed output, return a retryable state—never invented feedback.
- Avoid automatic unlimited retries. At most one controlled retry may be used for transient provider errors; subsequent attempts require an explicit user action and remain rate-limited.

## Limits and Constraints That Can Break the Application

| Risk or constraint | Failure mode | Required mitigation |
| --- | --- | --- |
| OpenAI quota, billing limit, or outage | Questions/evaluation cannot be generated. | Clear retry message; no false result; monitor usage; use a small curated fallback question set only if explicitly implemented and labelled. |
| AI latency or timeout | UI appears stuck; request may be duplicated by repeated clicks. | Loading state, request timeout, idempotency/deduplication key for answer evaluation, disable duplicate submit while pending. |
| Malformed AI response | UI/data persistence breaks or invalid scores are saved. | Schema-validate response; reject invalid output; preserve session in recoverable state. |
| High API usage / abuse | Budget is exhausted or provider rate limits are hit. | Per-user/IP limits, session question caps, daily budget monitoring, authentication on all AI routes. |
| Large/hostile file upload | Memory exhaustion, disk fill, parser crash, or path traversal. | Size/type limits, streaming uploads, controlled filenames, isolated storage, parser timeouts, cleanup. |
| Resume extraction failure | Question context unavailable. | Save controlled extraction status; let user continue without resume context or retry upload. |
| Voice transcription failure | Voice path cannot produce feedback. | Present transcript/retry error; keep typed answer as dependable fallback. |
| MongoDB outage or bad connection string | Login, persistence, sessions, and dashboard fail. | Validate config at startup; health check; safe error state; managed backups; do not claim saves succeeded. |
| MongoDB free-tier connection/storage limits | Intermittent connection failure or capacity exhaustion. | Use connection pooling, retain minimal data, set upload retention, monitor provider limits before demo. |
| Incorrect CORS/cookie settings | Browser rejects authenticated requests. | Configure exact production origin, HTTPS, credentials policy, and test deployed login—not just localhost. |
| Expired/misconfigured authentication secret | All sessions may be invalidated or insecure. | Store securely, use strong stable production secret, rotate deliberately with a migration/logout plan. |
| Static-host SPA routing | Refreshing a client route returns 404. | Configure host rewrite/fallback to the React entry point and test direct navigation/refresh. |
| Deployment sleep/cold start | First API call is slow; demo can time out. | Use a host appropriate for demo needs; warm/test the app before presentation; show loading states. |
| Environment-variable mismatch | Deployed app starts but cannot reach client, DB, or OpenAI. | Validate config at startup; maintain `.env.example`; perform a deployed smoke test. |
| Unbounded MongoDB documents | Large sessions eventually exceed limits or slow reads. | Cap question/answer counts and response sizes; retain only necessary data. |
| Browser microphone permissions | Voice recording is unavailable. | Request permission contextually; explain requirement; typed answer remains fully supported. |
| Unsupported browser/audio codec | Upload/transcription fails for some users. | Document supported browsers/codecs; validate client/server format; provide typed fallback. |
| Concurrent requests | Duplicate answers, questions, or completion summaries. | Use status checks, idempotency keys/unique operation IDs, and atomic updates where needed. |

## Availability and Safe Failure Behaviour

- Add `GET /health` (or equivalent) that reports basic API availability without exposing credentials or detailed infrastructure internals.
- Treat MongoDB persistence as mandatory for operations that claim to create, answer, or complete a session. If saving fails, return failure rather than a misleading success response.
- Make text input and evaluation the primary, best-tested path. Voice and resume enrichment must not block a user from completing a text-based interview.
- Preserve an active session when a question/evaluation call fails so the user can retry rather than start over.
- Display clear loading, retry, and fallback states in the UI. Do not leave indefinite spinners.
- Before a live demo, test sign-in, one question, one typed evaluation, dashboard history, resume upload, and voice capability on the actual deployed URL and browser.

## Logging, Monitoring, and Backups

- Log request IDs, route, status, latency, safe user/resource IDs where necessary, upload outcome, and AI operation outcome.
- Never log passwords, auth tokens, OpenAI keys, database URIs, full resume text, or full answer text by default.
- Configure error monitoring or at minimum managed-host logs, and review failures during development.
- Monitor AI requests, errors, timeouts, database connection errors, and storage usage against the chosen provider limits.
- Enable managed MongoDB backups where the selected plan supports them. For a student V1, export/seed non-sensitive demo data before important presentations.

## Deployment Checklist

- [ ] Production environment variables are configured and validated at startup.
- [ ] `.env`, secrets, upload directories, and build output are ignored by version control as appropriate.
- [ ] Database network access is restricted to the deployed backend where the provider supports it.
- [ ] CORS, HTTPS, cookie/token settings, and frontend API base URL work on the deployed domains.
- [ ] Rate limits, body limits, upload limits, AI timeouts, and question/session caps are enabled.
- [ ] Error handler returns safe, consistent API errors; unexpected stack traces are hidden from users.
- [ ] Frontend SPA rewrite and backend health endpoint are configured.
- [ ] A deployed smoke test covers the complete text flow and dashboard persistence.
- [ ] Resume/voice failures, AI outage, and expired login each show clear recovery behavior.

## V1 Non-Goals

This release does not require enterprise SSO, audit-grade compliance, multi-region failover, distributed tracing, complex secret rotation automation, malware scanning infrastructure, or formal certification. Those are later-stage concerns; the controls above are the minimum practical baseline for this project's data and external AI dependency.

# V1 Implementation Timeline — AI-Powered Interview Preparation Platform

## Planning Assumptions

- Duration: **8 weeks / 40 working days** (Monday–Friday). Weekends are reserved for rest, catch-up, or optional polish—not hidden dependencies for the core plan.
- Team: a small student team working in parallel where practical; all work remains within the documented React, Node/Express, MongoDB, and backend-only OpenAI architecture.
- Priority: make the text interview flow work end to end before adding resume, analytics, voice, or visual refinement.
- Definition of complete: code is implemented, reviewed, manually tested, and linked to its relevant success criterion—not merely started.
- Daily discipline: update the task board, pull/review changes, run relevant tests, and record blockers before ending the day.

## Milestones

| End of week | Demonstrable milestone |
| --- | --- |
| Week 1 | Repository, local environments, UI shell, API shell, MongoDB connection, and documented contracts are ready. |
| Week 2 | Users can sign up, log in, and access protected application pages. |
| Week 3 | A user can create a DSA/HR/System Design text interview and receive the first AI-generated question. |
| Week 4 | A user can submit a text answer, receive validated feedback, complete a session, and retrieve saved results. |
| Week 5 | A user can upload a resume and use it as bounded question context; dashboard history and summary work. |
| Week 6 | The constrained voice-answer path works; security, limits, and recovery states are in place. |
| Week 7 | The full application is tested, accessible, responsive, and deployed to a staging/production-like URL. |
| Week 8 | Demo readiness, bug fixes, documentation, final deployment verification, and project presentation preparation are complete. |

## Week 1 — Foundations and Shared Contracts

**Goal:** establish the project structure and remove setup uncertainty before feature work begins.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 1 | Review all approved design documents; confirm V1 scope, non-goals, team roles, Git workflow, definition of done, and task board. Initialize the repository if needed. | Team agreement on scope and a prioritized backlog tied to `SUCCESS_CRITERIA.md`. |
| 2 | Create the repository layout from `FOLDER_STRUCTURE.md`; scaffold React client and Express server; add README, `.gitignore`, `.env.example`, lint/format scripts. | Client and server start locally; no secrets are tracked. |
| 3 | Configure MongoDB connection, environment validation, backend app bootstrap, central error handler, `/health` endpoint, and basic request logging. | API starts only with valid required configuration and reports a safe health response. |
| 4 | Build the frontend app shell: routing, global styles/tokens, responsive navigation, protected-route placeholder, common button/card/alert/loading components. | Navigable responsive shell matching `UI_DESIGN.md`. |
| 5 | Define and review initial schemas, API response/error conventions, API client wrapper, and test setup. Add a short local-development guide. | Team can make a sample client-to-API request and run baseline tests/lint. |

**Week 1 review:** demo frontend shell + API health endpoint + database connection. Resolve setup blockers before Week 2.

## Week 2 — Authentication and User Foundation

**Goal:** deliver secure account access and protected data boundaries.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 6 | Implement `User` model/schema, password hashing, signup service/controller/route, request validation, and duplicate-email handling. | `POST /api/auth/signup` creates a safe user record; password is never stored plain-text. |
| 7 | Implement login, logout, `GET /api/auth/me`, secure auth/session or token middleware, and protected-route behavior. | A signed-in user can access `/me`; unauthenticated requests are rejected. |
| 8 | Build login/signup pages, forms, inline validation, auth API wrapper, auth state/context, and redirect behavior. | New user can sign up, log in, and see the authenticated app shell. |
| 9 | Add ownership-query helpers and protected route tests. Validate session/token expiry, invalid credentials, logout, duplicate accounts, and safe error messages. | Basic auth integration tests pass; foreign/missing credentials do not expose data. |
| 10 | Improve responsive/auth UI, add loading/error/retry states, run manual cross-browser smoke test, and review security settings (CORS, body limit, headers). | Polished authentication flow ready for the core feature. |

**Week 2 review:** create a fresh account, log out/in, refresh the application, and verify protected pages/API routes behave correctly.

## Week 3 — Interview Setup and Question Generation

**Goal:** create sessions and generate one controlled, relevant question at a time.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 11 | Implement `InterviewSession` schema with user ownership, type, level, status, embedded questions, and V1 limits. Add indexes from `DATABASE_DESIGN.md`. | Session model validates only DSA, HR, and System Design with allowed levels. |
| 12 | Build interview setup page: interview-type cards, level selector, form validation, and loading/retry UI. | User can select type and level and submit an interview-start request. |
| 13 | Implement `openaiService` question-generation operation, prompt builder, output schema validation, timeout, and development usage limit. Use mocked provider tests first. | Service returns a validated question shape or a controlled error. |
| 14 | Implement `POST /api/interviews` and `POST /api/interviews/:id/questions`: ownership checks, session creation/state transitions, question persistence, and question cap. | API creates an active owned session with a persisted first question. |
| 15 | Connect setup UI to API; build the active-interview question header/progress state; test all three interview types and provider failure/retry behavior. | User can begin DSA, HR, and System Design sessions and see a saved question. |

**Week 3 review:** deployed/local walkthrough from login → choose type/level → receive question. Do not begin voice work yet.

## Week 4 — Text Answers, Feedback, and Completion

**Goal:** finish the indispensable text-based interview loop end to end.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 16 | Build the active-session text answer area, draft preservation, question navigation rules, duplicate-submit prevention, and clear loading UI. | User can enter a non-empty answer without losing it during normal navigation/error states. |
| 17 | Implement answer persistence and ownership/state checks for `POST /api/interviews/:id/answers`. | Valid text answer is attached to the correct owned active question/session. |
| 18 | Implement OpenAI evaluation prompt/service, strict structured-feedback schema validation, score range checks, timeout, and safe retry behavior. | Valid feedback has scores, strengths, improvements, and next step; malformed AI output is rejected. |
| 19 | Build feedback UI: overall/dimension scores, plain-language labels, strengths, improvements, next action, and assistive-AI disclaimer. | User receives readable feedback after a typed answer. |
| 20 | Implement session retrieval and completion endpoint/summary calculation; add result page and tests for the entire text path. | User completes a session, reloads it, and sees saved questions, answers, feedback, and summary. |

**Week 4 review / core milestone:** demonstrate sign in → start interview → answer by text → feedback → complete → retrieve saved result. This path must be stable before adding optional features.

## Week 5 — Resume Context and Analytics Dashboard

**Goal:** add the two main V1 enrichment/value features without weakening the core loop.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 21 | Implement resume upload middleware and `Resume` schema: authentication, file type/size allow-list, safe server-side naming/storage reference, cleanup paths. | Unsupported/oversized uploads fail safely; approved files create owned resume records. |
| 22 | Add resume text extraction with time/resource limits and status handling. Build backend-only bounded context selection for question prompts. | A valid resume reaches `completed` extraction status; failed extraction has a recoverable state. |
| 23 | Build resume management/upload UI and integrate optional resume selection into interview setup. Test permission, extraction, and no-resume fallback states. | User can upload/select a resume or continue normally without one. |
| 24 | Implement analytics aggregation/service and `GET /api/analytics/summary`: recent sessions, counts, scores, type averages, simple time trend. | Endpoint returns only the current user's completed-session summary, including an empty well-formed state. |
| 25 | Build dashboard cards, history, responsive simple trend/chart, empty state, and result-to-dashboard navigation. Reconcile displayed values against saved session data. | Multiple completed sessions appear correctly in an appealing dashboard. |

**Week 5 review:** upload a sample resume, start a resume-informed session, complete multiple sessions, and verify only the owner's history/analytics appear.

## Week 6 — Voice Path, Security Hardening, and Constraints

**Goal:** deliver the limited voice requirement and protect the application against predictable failures/abuse.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 26 | Implement browser voice capture UI: permission request, recording/stop/re-record, supported-format checks, processing state, and text fallback. | A supported browser records a short response; microphone denial has a clear typed-answer fallback. |
| 27 | Implement dedicated voice-answer upload/transcription service/route with file validation, timeout, temporary-file cleanup, and transcript validation. | Approved audio becomes usable text or returns a controlled retryable error. |
| 28 | Connect transcription to the shared answer-evaluation pipeline; store only required audio reference/transcript according to retention decision; test completed voice flow. | User receives the same structured feedback for a voice-derived answer. |
| 29 | Implement/verify rate limits, AI request caps, question/session caps, request body limits, CORS, security headers, upload quotas, and AI timeout/retry behavior. | Limits are configured, tested, and documented; duplicate requests do not create duplicate evaluations. |
| 30 | Perform a security and reliability review using `SECURITY_&_DEPLOYMENT.md`: ownership attacks, invalid IDs, malformed AI output, dependency outage, extraction/transcription failure, and persistence failure. | Findings are fixed or logged as explicit V1 limitations with user-facing recovery behavior. |

**Week 6 review:** complete one text and one voice session; deliberately trigger key failure states and verify the app remains honest and recoverable.

## Week 7 — Test, Accessibility, Responsive Polish, and Deployment

**Goal:** turn features into a dependable product on the real deployment environment.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 31 | Write/finish backend unit and integration tests for auth, ownership, interview creation, question/evaluation validation, completion, resume upload, and analytics. | Core API tests run against test configuration with mocked AI/transcription where appropriate. |
| 32 | Add frontend/component and critical end-to-end tests: signup/login, text session, saved dashboard history, error/retry paths, and voice path where testable. | Automated tests cover the primary user journey and high-risk regressions. |
| 33 | Audit UI against `UI_DESIGN.md`: keyboard flow, focus states, labels, contrast, reduced motion, mobile layout, empty/loading/error states, and 200% zoom. | Accessibility/responsive issues are fixed or documented with owner/date. |
| 34 | Configure frontend/backend hosting, managed MongoDB access, environment variables, CORS/cookies, SPA rewrite, health endpoint, and production logging. | Staging or production-like deployment is reachable over HTTPS. |
| 35 | Run full deployed smoke test on actual target browser/device: authentication, all types, text feedback, resume, dashboard, voice, logout, refresh/deep links. | Deployment defects are prioritized and fixed before Week 8; a tested demo URL is available. |

**Week 7 review:** run the complete `SUCCESS_CRITERIA.md` release gate against the deployed application, not just localhost.

## Week 8 — Stabilisation, Demo, and Final Delivery

**Goal:** preserve time for defects, evidence, presentation, and final verification rather than adding new scope.

| Day | Planned work | Deliverable / check |
| --- | --- | --- |
| 36 | Triage all known defects by severity; fix blockers in authentication, text flow, persistence, dashboard, and security first. Freeze new feature requests unless they fix a release criterion. | No known critical defect blocks the core text path. |
| 37 | Run performance/reliability checks: repeated sessions, concurrent/duplicate submissions, AI timeout, provider failure, upload limits, expired login, database reconnect, and mobile responsiveness. | Each tested failure has a safe message and recovery path. |
| 38 | Prepare demo data/account, verify data isolation, write setup/run/deployment instructions, and update all design documents for implementation differences. | README and documentation accurately match the delivered application. |
| 39 | Rehearse the project demo and viva explanation: problem, V1 scope, architecture, data flow, security limits, question generation, AI evaluation boundary, known limitations, and future work. | Team can give a concise end-to-end demo without relying on live debugging. |
| 40 | Final release checklist: clean build, tests/lint, deployed smoke test, backup/export of non-sensitive demo data, environment verification, tag/release snapshot, and presentation handoff. | Release candidate meets definition of done and has a rollback/recovery note. |

**Week 8 release gate:** every required functional criterion in `SUCCESS_CRITERIA.md` is demonstrated. Text flow, saved feedback, and dashboard history are mandatory. Resume and voice paths must either work as documented or clearly show the designed fallback without breaking the core product.

## Daily Work Pattern

Use this cadence every working day to prevent late integration surprises:

1. **Start (15 minutes):** review yesterday's work, select the day's deliverable, and identify dependencies.
2. **Build (main block):** implement one coherent vertical slice or bounded task; avoid parallel changes to the same files.
3. **Integrate (30–60 minutes):** pull/review teammate changes, run lint/tests, and test the affected UI/API path.
4. **Record (15 minutes):** update task status, link evidence, note risks/blockers, and state the next day's starting point.

## Scope and Contingency Rules

- If behind schedule, protect in this order: authentication → text interview creation → typed answer evaluation → saved completion → dashboard history → resume enrichment → voice polish → visual enhancements.
- Do not add agentic orchestration, company-specific content, live video, payments, mobile apps, proctoring, or advanced gamification during the timeline.
- A blocked external dependency (OpenAI quota, hosting issue, transcription limitation) must trigger the documented fallback/retry behavior and a same-day escalation within the team; it must not silently stall unrelated work.
- Reserve Week 8 for stability. New scope needs an explicit trade-off: remove or defer a lower-priority item first.
- Track all constraints from `SECURITY_&_DEPLOYMENT.md`, especially rate limits, upload size/type limits, AI quotas/timeouts, provider configuration, and browser microphone compatibility.

## Final Definition of Done

The V1 implementation is done only when the deployed application lets a new user sign up, select DSA/HR/System Design, receive a question, submit a typed answer, receive structured feedback, complete the session, and see saved progress on the dashboard. It must preserve user isolation, protect credentials, handle expected external failures honestly, and include a tested limited voice path plus optional resume-informed question generation.

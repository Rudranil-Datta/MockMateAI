# V1 API Design — AI-Powered Interview Preparation Platform

## Conventions

- Base path: `/api`.
- Format: JSON for standard requests/responses; `multipart/form-data` for file/audio uploads.
- Authentication: use the application's secure session or token mechanism. Protected routes require an authenticated user.
- Authorization: every resource route verifies that the record belongs to the authenticated user.
- IDs: MongoDB ObjectIds represented as strings.
- Timestamps: ISO 8601 UTC strings.
- The React frontend calls this API only; it never calls MongoDB or Gemini directly. Gemini is the V1 backend provider; an optional future OpenAI adapter uses the same service contract.

## Standard Response Shapes

Successful responses return their relevant resource in a stable JSON shape. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Choose a supported interview type.",
    "fields": {
      "interviewType": "Must be DSA, HR, or System Design."
    }
  }
}
```

Use suitable HTTP status codes:

| Status        | Meaning                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`         | Successful read/update/action.                                                                                                                             |
| `201`         | Resource created.                                                                                                                                          |
| `400`         | Invalid request or invalid state transition.                                                                                                               |
| `401`         | Missing or invalid authentication.                                                                                                                         |
| `403`         | Authenticated but not permitted.                                                                                                                           |
| `404`         | Resource not found (including safely hidden foreign resources).                                                                                            |
| `409`         | Duplicate/conflicting state, such as an existing email.                                                                                                    |
| `413`         | Upload exceeds configured size limit.                                                                                                                      |
| `415`         | Unsupported upload type.                                                                                                                                   |
| `422`         | Valid request format but unusable content, such as blank transcription.                                                                                    |
| `429`         | Rate or development-usage limit reached. For provider quota exhaustion use `AI_QUOTA_EXCEEDED` and a `Retry-After` header when a safe retry time is known. |
| `500`         | Unexpected server error.                                                                                                                                   |
| `502` / `504` | Upstream AI service failed or timed out; return a retryable safe message.                                                                                  |

Raw database, provider, and stack errors must not be exposed to clients.

`GET /health` is an unauthenticated process-liveness endpoint and returns `200 { "status": "ok" }` without testing dependencies. `GET /ready` is separate readiness: it performs a bounded MongoDB ping and returns `200 { "status": "ready" }` or `503 { "status": "unavailable" }` without dependency details.

### AI quota exhaustion response

When the configured provider rejects a request because its quota is exhausted, preserve the session/answer state and return:

```json
{
  "error": {
    "code": "AI_QUOTA_EXCEEDED",
    "message": "AI practice is temporarily unavailable. Your saved work is safe; try again later."
  }
}
```

The frontend presents this message once for the failed action and offers a retry only after user action. The backend must not rotate keys, issue unlimited retries, or fabricate a question/evaluation.

### Rate-limit responses

Day 29 applies the following bounded V1 limits before costly route work:

- signup/login: 20 requests per direct IP per 15 minutes;
- AI-consuming interview actions: 20 per authenticated user and 60 per direct IP per hour;
- AI-consuming actions across the single API process: 200 per UTC day;
- resume/voice uploads: 10 per authenticated user and 30 per direct IP per hour.

Local limits return `429` with `AUTH_RATE_LIMITED`, `AI_RATE_LIMITED`, or `UPLOAD_RATE_LIMITED` plus a whole-second `Retry-After` header. These errors never impersonate `AI_QUOTA_EXCEEDED`, which is reserved for configured-provider quota exhaustion. Counters use bounded process memory, reset on restart, and are suitable only for the approved single-process V1 deployment. Authentication identity comes only from the verified cookie; request data cannot select another user's bucket.

## Authentication

### `POST /api/auth/signup`

Creates an account.

```json
// request
{ "name": "Asha Kumar", "email": "asha@example.com", "password": "user-selected-secret" }

// 201 response
{ "user": { "id": "...", "name": "Asha Kumar", "email": "asha@example.com", "profile": {} } }
```

Validate a normalized unique email of at most 254 characters and the password policy. Hash the password before storage. Establish auth state according to the chosen secure session/token approach.

### `POST /api/auth/login`

Authenticates an existing user.

```json
// request
{ "email": "asha@example.com", "password": "user-selected-secret" }

// 200 response
{ "user": { "id": "...", "name": "Asha Kumar", "email": "asha@example.com", "profile": {} } }
```

### `POST /api/auth/logout`

Ends the current authenticated session/token context. Returns `204 No Content` or a documented `200` confirmation.

### `GET /api/auth/me`

Returns the current user's safe profile.

```json
{
  "user": {
    "id": "...",
    "name": "Asha Kumar",
    "email": "asha@example.com",
    "profile": { "experienceLevel": "intermediate" }
  }
}
```

Malformed JSON is rejected before route validation with `400 MALFORMED_JSON` and the stable message `Request body must contain valid JSON.` Parser details and submitted values are never returned.

## Resumes

### `POST /api/resumes`

Uploads a supported resume and performs bounded local text extraction before persisting owned final metadata. The safe response reports `completed` or `failed`; the raw PDF is temporary and deleted before the request finishes on every outcome. A failed extraction requires re-upload and never returns parser details.

- Content type: `multipart/form-data`
- Required field: `resume`
- Protected route.

```json
// 201 response
{
  "resume": {
    "id": "...",
    "originalName": "Asha-Kumar-Resume.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 124000,
    "extractionStatus": "completed",
    "createdAt": "2026-09-02T00:00:00.000Z"
  }
}
```

Reject missing, empty, unsupported, invalid-signature, oversized, multiple, or unexpected-field uploads before persistence. Multiple or unexpected files return `400 INVALID_RESUME_UPLOAD`; unsupported types return `415`, and oversized files return `413`. Local extraction rejects documents above 20 pages, processes accepted pages one at a time, stops normalized accumulation at 50,000 characters, and runs in a resource-limited worker that is terminated before a 5-second timeout is reported. Treat malformed, password-protected, image-only, empty-text, timed-out, crashed, or resource-exhausted parsing as a safe `failed` state. Delete temporary raw bytes on every path. Do not return extracted resume text, extraction details, or legacy internal storage references.

### `GET /api/resumes`

Returns up to 100 of the authenticated user's resume metadata records, newest first. Protected route. Ownership comes only from the authenticated session.

```json
// 200 response
{
  "resumes": [
    {
      "id": "...",
      "originalName": "Asha-Kumar-Resume.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 124000,
      "extractionStatus": "completed",
      "createdAt": "2026-09-02T00:00:00.000Z"
    }
  ]
}
```

The empty state is `{ "resumes": [] }`. Never return `userId`, `storage`, `extractedText`, `extractionError`, or another user's metadata. Persistence failures use the central safe error response.

### `DELETE /api/resumes/:id`

**Deferred during Day 23 pending an approved reference/retention policy; not implemented.**

Optional but recommended for privacy. Deletes an owned resume under the documented reference/retention policy. Protected route.

## Interviews

### `POST /api/interviews`

Creates an active interview session and returns its first question.

```json
// request
{
  "idempotencyKey": "client-generated-UUID-retained-for-retry",
  "interviewType": "DSA",
  "level": "intermediate",
  "resumeId": "optional-owned-resume-id"
}

// 201 response
{
  "interview": {
    "id": "...",
    "interviewType": "DSA",
    "level": "intermediate",
    "status": "active",
    "startedAt": "2026-09-02T00:00:00.000Z"
  },
  "question": {
    "id": "...",
    "order": 1,
    "prompt": "Explain the difference between a stack and a queue."
  }
}
```

Require a client-generated UUID `idempotencyKey`; the client retains it for retries of the same setup and replaces it when setup choices change. Accept only `DSA`, `HR`, and `System Design`. Confirm `resumeId`, if present, belongs to the user and has completed extraction. Send only a normalized deterministic excerpt of at most 2,000 characters through the backend provider contract; never return that context to the client. If question generation fails, return a safe retryable error and do not present a non-existent question as active. Replaying a completed key returns the same persisted interview/question; concurrent generation receives a safe conflict without another provider call.

### `POST /api/interviews/:id/questions`

Generates/retrieves the next question for an owned active session.

```json
// request
{ "idempotencyKey": "client-generated-UUID-retained-for-retry" }
```

```json
// 200 response
{ "question": { "id": "...", "order": 2, "prompt": "..." } }
```

Reject completed sessions and enforce the configured V1 question limit. Replaying a completed key returns the same persisted question. A short database-backed generation lease prevents simultaneous requests from multiplying provider calls and permits recovery after interrupted work. Validated provider output is retained inside the private claim before the final question write, so retry after a final-write failure does not call the provider again.

Day 4 keeps both interview routes on V1 `generateQuestion`. When a saved
question later contains complete adaptive metadata, question responses may also
include `topicKey`, `testedSkillKeys`, `difficulty`, optional
`parentQuestionId`, `decisionType`, and `reasonCode`; metadata-free V1 responses
remain unchanged. Partial metadata is never serialized or accepted by the
client.

The internal provider-neutral `generateAdaptiveQuestion` contract accepts one
exact bounded object: five-type interview enum, level, session purpose, 1–12
coverage entries, 0–5 prior summaries, nullable known focus skill, and nullable
confirmed-context summary. Context is capped at 16 KiB and normalized total
input at 32 KiB. It returns the exact Day 1 decision object. Day 5, not the
provider adapter, will enforce adaptive transition legality.

### `POST /api/interviews/:id/answers`

Submits a typed answer for an owned active question, then evaluates it through the backend-only provider adapter. The answer is persisted before evaluation. If evaluation fails, the saved answer remains retryable and no feedback is fabricated.

```json
// request
{
  "idempotencyKey": "client-generated-UUID-retained-for-retry",
  "questionId": "...",
  "text": "A stack is LIFO, while a queue is FIFO."
}

// Day 18 200 response
{
  "answer": { "id": "...", "inputMode": "text", "text": "A stack is LIFO, while a queue is FIFO.", "submittedAt": "2026-09-02T00:00:00.000Z" },
  "feedback": {
    "overallScore": 84,
    "accuracyScore": 90,
    "clarityScore": 85,
    "confidenceScore": 76,
    "strengths": ["Correctly identifies LIFO and FIFO."],
    "improvements": ["Add a short real-world example."],
    "nextStep": "Practise explaining a use case for each structure."
  }
}
```

Confirm session/question ownership and active state. Validate the operation UUID and non-empty bounded text before saving. Persist the first accepted answer text and never replace it from a retry payload. The client retains one operation UUID across retry; replay after completion returns the same persisted answer and feedback, while another operation is rejected as a duplicate.

A private 30-second database claim permits only one active evaluation. Stale claims are recoverable and claim release is ownership-scoped so an older worker cannot release a newer claim. Validated provider output is staged privately before the final feedback write; retry after a final-write failure reuses that staged output without another provider call. Claim/output metadata is never returned by the API. Validate every feedback field before persistence and rendering. Map quota exhaustion to `AI_QUOTA_EXCEEDED`; timeout, malformed output, generic provider failures, and persistence failures preserve the saved answer and return safe retryable errors.

### `POST /api/interviews/:id/voice-answers`

Validates and transcribes one audio answer, atomically converts the completed transcript into an immutable voice answer, and evaluates it through the same provider-neutral claim/staging/finalization service used by typed answers.

- Content type: `multipart/form-data`
- Required fields: exactly one `audio`, `questionId`, and client-generated `idempotencyKey` UUID.
- Protected route; the session must be owned and active and the question must be unanswered.
- Accepted declared formats/extensions: WebM (`.webm`), Ogg (`.ogg`), Opus (`.opus`), and ISO-BMFF MP4 (`.mp4`/`.m4a`), subject to matching signature checks and a 5 MiB ceiling.
- Audio is stored under a generated private temporary name and deleted before success or error is returned. Only bounded validated transcript text is staged privately.

```json
// 200 response
{
  "answer": {
    "id": "...",
    "inputMode": "voice",
    "text": "Transcribed answer text",
    "submittedAt": "2026-09-27T00:00:00.000Z"
  },
  "feedback": {
    "overallScore": 84,
    "accuracyScore": 90,
    "clarityScore": 85,
    "confidenceScore": 76,
    "strengths": ["Clear explanation."],
    "improvements": ["Add a concrete example."],
    "nextStep": "Practise the answer once more with an example."
  }
}
```

The first operation acquires a private 30-second transcription claim. A validated completed transcript is atomically consumed into one `inputMode: "voice"` answer using the same operation UUID, then evaluated by the shared answer-evaluation service. The private transcript handoff is removed after conversion; raw audio and `voiceStorageKey` are never retained. A completed same-key replay returns the saved answer and feedback without another transcription or evaluation call. Same-key concurrent evaluation returns the controlled evaluation-in-progress conflict; different operations and mixed typed/voice submissions return a controlled conflict.

Blank, unsafe, or over-10,000-character provider transcription output returns `422 UNUSABLE_TRANSCRIPTION`. Transcription or evaluation quota, timeout, malformed-output, provider, and persistence failures are normalized without exposing provider details. A saved voice answer remains retryable with the same UUID, and retry does not retranscribe. Validated staged evaluation output is reused after a final feedback-write failure. No feedback is invented.

The first Day 27 Gemini `audio/mp4` evidence request returned normalized `502 TRANSCRIPTION_UNAVAILABLE`. A separately approved diagnostic on 2026-09-27 repeated the exact model, request options, MIME, and representative 2.7-second ISO-BMFF sample and returned a non-empty bounded transcript. Direct configured-provider MP4 transcription is therefore empirically supported. No conversion dependency was added. Provider failures now retain only safe categories for quota, timeout, rejected input, configuration/access, network, upstream availability, or unknown failure; raw provider details remain private.

### `GET /api/interviews/:id`

Returns one owned session, including questions, submitted answers, feedback, and summary when present. Protected route.

```json
// 200 response
{
  "interview": {
    "id": "...",
    "interviewType": "DSA",
    "level": "intermediate",
    "status": "completed",
    "startedAt": "2026-09-02T00:00:00.000Z",
    "completedAt": "2026-09-02T00:20:00.000Z",
    "questions": [
      {
        "id": "...",
        "order": 1,
        "prompt": "...",
        "answers": [
          {
            "id": "...",
            "inputMode": "text",
            "text": "...",
            "submittedAt": "2026-09-02T00:10:00.000Z",
            "feedback": { "overallScore": 82 }
          }
        ]
      }
    ],
    "summary": { "overallScore": 82 }
  }
}
```

The route returns only safe persisted session fields and applies ownership filtering before reading. Role Simulation and Project Defense results may include a saved `contextSnapshot` containing only its immutable `kind` and display `label`; it never rereads a mutable source. A completed owned targeted-practice result may include `retestComparison` only when synchronized prior/current deterministic mastery exists. That optional object contains only skill key/label, integer mastery scores, and categorical confidence labels. Pending or unavailable comparison is omitted; raw evidence, answers, prompts, provider payloads, source identifiers, and hiring inferences never return. Private generation/evaluation keys, claims, staged output, and lease state are never returned.

### `POST /api/interviews/:id/complete`

Completes an owned active session and calculates/saves its summary.

```json
// 200 response
{
  "interview": {
    "id": "...",
    "status": "completed",
    "completedAt": "2026-09-02T00:00:00.000Z",
    "summary": {
      "overallScore": 82,
      "accuracyScore": 86,
      "clarityScore": 80,
      "confidenceScore": 78,
      "strengths": ["..."],
      "improvements": ["..."],
      "recommendation": "..."
    }
  }
}
```

Requires at least one evaluated answer and no pending or staged evaluation or question generation. The owned transition is atomic and conflict-safe; a persistence failure leaves the session active for retry. Rejects attempts to complete another user's session or an already completed session; successful responses include safe persisted questions and answers with the completed summary.

## Analytics

### `GET /api/analytics/summary`

Returns dashboard-ready history and simple aggregated progress for the current user.

```json
{
  "summary": {
    "completedSessions": 4,
    "averageOverallScore": 78,
    "averageAccuracyScore": 80,
    "averageClarityScore": 76,
    "averageConfidenceScore": 74
  },
  "typeAverages": [
    { "interviewType": "DSA", "averageOverallScore": 81 },
    { "interviewType": "HR", "averageOverallScore": 75 }
  ],
  "recentSessions": [
    {
      "id": "...",
      "interviewType": "DSA",
      "level": "intermediate",
      "completedAt": "2026-09-02T00:00:00.000Z",
      "overallScore": 82
    }
  ],
  "trend": [
    { "completedAt": "2026-08-27T00:00:00.000Z", "overallScore": 72 },
    { "completedAt": "2026-09-02T00:00:00.000Z", "overallScore": 82 }
  ]
}
```

The endpoint reads only the authenticated user's valid completed sessions. A valid analytics record has a supported interview type and level, a completion date, and all four summary scores within `0` to `100`. Malformed legacy records are excluded without exposing their contents. All averages are rounded to the nearest whole number, with half values rounded toward positive infinity.

`typeAverages` contains only interview types with valid completed sessions and follows the supported order: DSA, HR, System Design. `recentSessions` contains at most the latest 10 records, ordered by `completedAt` descending and then ID descending. `trend` contains those same records in chronological order, with ID ascending as the equal-time tie-breaker. Full ISO completion timestamps keep multiple same-day sessions distinct.

When no valid completed sessions exist, the endpoint returns zero for the count and all averages, plus empty `typeAverages`, `recentSessions`, and `trend` arrays.

## Cross-Cutting Requirements

- Validate all input on the server, regardless of frontend validation.
- Rate-limit or otherwise cap question generation, evaluations, and uploads during development.
- Limit standard JSON bodies to the configured 100 KiB ceiling; multipart upload limits remain independent.
- Set request timeouts for AI calls to 1-20 seconds and provide clear UI retry states. V1 performs no automatic provider retry; later attempts require explicit user action and remain rate-limited.
- Keep Gemini/OpenAI API keys and database credentials only in backend environment variables.
- Log safe operational identifiers/statuses, not passwords, secrets, or unnecessary resume/answer contents.
- Label returned evaluation as interview-practice feedback, not an automated hiring determination.

## V2 API Additions

These additive contracts are governed by `V2_IMPLEMENTATION_PLAN.md` and require
separate approval for their owning implementation days. Existing V1 endpoints
and response/error shapes remain authoritative until implementation is verified.

The exact Day 1 request fields, bounds, response compatibility rules,
lifecycles, status codes, and error codes are frozen in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). This section is the API overview;
the Day 1 contract is authoritative where this overview is less specific.

### Day 2 implemented Job Target API

The following authenticated routes are implemented:

- `POST /api/job-targets`: exact `{idempotencyKey,title,company?,description}`;
  returns `201 {target}` after validated analysis.
- `GET /api/job-targets`: returns at most 50 owned targets as `{items}`, newest
  first.
- `GET /api/job-targets/:id`: returns `{target}`.
- `PATCH /api/job-targets/:id`: accepts `idempotencyKey` plus at least one of
  `title`, `company`, or `description`; `company:null` clears company and
  material changes rerun analysis.
- `POST /api/job-targets/:id/analyze`: accepts exactly `{idempotencyKey}` and
  retries a failed or stale analysis.
- `DELETE /api/job-targets/:id`: deletes the owned source and returns `204`.

Target responses contain only `id`, source fields, status, validated analysis
when ready, safe failure category when failed, and timestamps. Claim/request
IDs are private. AI routes use existing auth, AI rate/daily limits, provider
timeout, and safe errors. Missing and foreign targets both return
`JOB_TARGET_NOT_FOUND`; active claims return
`JOB_TARGET_ANALYSIS_IN_PROGRESS`; changed same-key input returns
`IDEMPOTENCY_KEY_REUSED`.

### Day 3 implemented Candidate Project API

- `POST /api/projects/extract` accepts exactly `{idempotencyKey,resumeId}` for an
  owned completed resume. It returns `{drafts}` with 0–5 validated suggestions,
  `sourceResumeId`, and `source="resume_suggestion"`; it never writes them.
- `POST /api/projects` accepts the complete editable facts, optional
  `sourceResumeId`, and literal `confirmed:true`; it returns `201 {project}`.
- `GET /api/projects` returns at most 50 owned confirmed projects newest first;
  `GET /api/projects/:id` returns one owned project.
- `PATCH /api/projects/:id` requires the complete facts and renewed literal
  confirmation. `DELETE /api/projects/:id` removes only the source.

Extraction uses existing auth and AI limits plus a private 60-second,
100-entry process cache/in-flight claim. Same key and resume replays; changed
resume conflicts with `IDEMPOTENCY_KEY_REUSED`. Missing/foreign/incomplete
resume context returns `RESUME_CONTEXT_UNAVAILABLE`; missing and foreign
projects return `PROJECT_NOT_FOUND`. If all 100 bounded cache entries are still
in flight, new extraction returns `PROJECT_EXTRACTION_BUSY` rather than
evicting active work. Project CRUD does not consume AI quota.

### Day 9 implemented skill profile

`GET /api/skills/profile` is authenticated and returns at most 30 owned,
evidence-derived skills ordered by mastery ascending then evidence count
descending, plus `recommendedAction` and `evidenceSyncStatus`. A skill includes
only `skillKey`, `skillLabel`, `masteryScore`, `masteryLabel`, `confidence`,
`evidenceCount`, and `lastPracticedAt`. `recommendedAction` is either `null` or
`{type:"targeted_practice",skillKey}` for the lowest non-established skill;
it is a payload only. Day 10 owns presentation and starting targeted practice.

The endpoint returns no raw answer, prompt, feedback text, provider output,
hidden reasoning, evidence reason, or source identifiers. Profile reads attempt
bounded idempotent recovery for pending owned evidence. `evidenceSyncStatus`
is `pending` only when recovery still cannot complete; feedback remains
available through unchanged interview responses.

### V2 Extension E4 Coach roadmap API

`GET /api/coach/roadmap` is authenticated, read-only, and rate-limited to 120
requests per user and 240 per IP per 15 minutes. It accepts exactly one query
selection: `context=overall`; `context=target&targetId=<owned ready ObjectId>`;
or `context=project&projectId=<owned confirmed ObjectId>`. Unknown, repeated,
missing, ambiguous, or malformed fields return the standard `400
VALIDATION_ERROR` shape. Missing and foreign Target/Project contexts both return
`404 COACH_CONTEXT_UNAVAILABLE` without resource details.

The response contains only `{context:{kind,label}, evidenceSyncStatus, skills,
actions}`. Skills are capped at 12 and contain safe key/label, categorical
confidence, evidence count, and nullable derived mastery only. Actions are
three to five allow-listed internal links for adding context, confirming a
project, collecting evidence, targeted practice, retesting, or replay review.
The route never returns raw answers, prompts, feedback, provider output, hidden
reasoning, source text, storage identifiers, private evidence, or a
hiring/readiness guarantee.

Coach reads use a non-mutating projection of the existing evidence formula.
Pending status comes from an owned pending-session existence read; Coach never
invokes profile reconciliation, writes evidence, calls a provider, caches, or
changes interview contracts. Overall uses the existing weak/non-established
recommendation; Target orders by weight then evidence/mastery/confidence; and
Project orders confirmed coverage categories needing evidence before stable
keys.

Every implemented route derives `userId` from authentication, validates bounded input, hides
foreign records as not found, and uses the existing standard error shape.

### V2 Extension E5 Coach knowledge-tree API

`GET /api/coach/tree` is authenticated, read-only, and uses the same 120
requests per user and 240 per IP per 15-minute Coach limit as the roadmap. Its
query selection and invalid/missing/foreign error behaviour are exactly the
roadmap contract above: Overall, owned ready Job Target, or owned confirmed
Project only.

The response contains only `{context:{kind,label}, evidenceSyncStatus, nodes,
edges, omittedSkillCount}`. It has one context node, at most 12 safe branch
nodes, at most 12 safe skill nodes, at most 25 nodes and 24 edges. Edges only
connect context-to-branch or branch-to-skill known IDs. Target branch/skill
relationships use saved analysed requirements in stable order; Project branches
are non-empty confirmed coverage categories; Overall has one direct evidence
branch. A selected skill is linked once to its first safe branch so bounds never
silently produce a partial relationship graph.

Skill nodes contain only safe key/label, evidence count, categorical confidence,
nullable derived mastery, and an optional owned completed replay path of the
form `/practice/:id/results`. They exclude source records, answers, prompts,
feedback, provider data, reason codes, storage IDs, private evidence, and
hiring/readiness claims. The tree uses the same non-mutating evidence projection
as E4: no reconciliation, provider call, cache, persistence write, migration,
or interview lifecycle change occurs.

### Interview planning and extended interview contract

#### `GET /api/interviews/plan`

Returns a bounded, deterministic, read-only preview before interview start.
Protected route; it is registered before `GET /api/interviews/:id`.

Required query fields are `interviewType` and `level`. The optional fields
match the supported start selection: `jobTargetId` only for Role Simulation,
`projectId` only for Project Defense, completed owned `resumeId`, and
`sessionPurpose=targeted_practice` with `focusSkillKey`. Unknown, repeated,
ambiguous, or mismatched fields return the standard `400 VALIDATION_ERROR`.
Missing or foreign owned context returns the same safe `404` response.

```json
{
  "adaptiveNotice": "Later questions adapt to your answers and are not prewritten.",
  "context": { "kind": "job_target", "label": "Backend Engineer" },
  "openingFocus": { "label": "Node.js", "topicKey": "node-js" },
  "rationale": { "kind": "target_coverage" },
  "selection": {
    "interviewType": "Role Simulation",
    "level": "advanced",
    "sessionPurpose": "standard"
  },
  "stages": [
    {
      "focus": { "label": "Node.js", "topicKey": "node-js" },
      "order": 1,
      "type": "opening"
    }
  ]
}
```

`context` is `null` for generic and targeted-practice previews. The response
has one to five ordered stages, never includes database IDs, source text,
resume text, project facts, evidence reasons, answers, prompts, provider data,
scores, readiness, or hiring claims. Generic DSA, HR, and System Design stages
are fixed planning labels; Role Simulation and Project Defense use saved
deterministic coverage ordering; targeted practice uses the selected owned weak
skill and categorical evidence only.

The endpoint is limited to 120 authenticated-user and 240 IP requests per
15 minutes (`PLANNER_RATE_LIMITED`). It does not call an AI provider, consume
AI quota, mutate/reconcile evidence, cache, create a session, or persist data.
The client must obtain a current valid preview before using the unchanged
`POST /api/interviews` start action.

Days 6–7 add `Role Simulation` and `Project Defense` to
`POST /api/interviews`. Role Simulation requires an owned `ready` target;
Project Defense requires an owned confirmed, structurally valid project.
`jobTargetId` and `projectId` are accepted only for their matching types, and
`sessionPurpose` defaults to `standard`. Targeted practice and `focusSkillKey`
remain planned.

The full planned additive field set remains:

```json
{
  "jobTargetId": "owned ObjectId required for Role Simulation",
  "projectId": "owned confirmed ObjectId required for Project Defense",
  "sessionPurpose": "standard | targeted_practice",
  "focusSkillKey": "required for targeted_practice"
}
```

The existing type, level, resume, idempotency, five-question, answer,
completion, and ownership contracts remain. V2 question/session responses may
add bounded topic, difficulty, tested-skill, parent-question, decision-type, and
safe-reason metadata. Historical V1 responses must remain consumable when these
fields are absent.

Role Simulation sessions now keep an analysis-only target snapshot capped at
16 KiB, so source edit/deletion cannot alter replay. Coverage sorts skills by
descending weight with stable source-order ties; the highest-weight skill opens.
Job Target/Project edits or deletion must not alter historical interviews;
new costly AI actions remain
rate-limited, finite-timeout, idempotent where retried, and safely recoverable.

Project Defense sessions keep a facts-only project snapshot capped at 16 KiB.
The opening category is architecture. Day 8 follow-ups add optional
`challengeAxis` and `challengeAnchorKey` question fields alongside the existing
parent link. They are emitted only for Project Defense follow-ups and identify
one server-selected confirmed snapshot anchor; opening, Role Simulation, V1,
and historical questions omit them.

The adaptive provider input includes one exact Project-only challenge directive
with an allowed axis, safe anchor key, confirmed anchor text, and at most 2,000
characters from the latest saved answer. Output must echo the axis/key and
visibly include the exact anchor text. Unknown, mismatched, generic, oversized,
or extra output fails as `INVALID_AI_RESPONSE` before question persistence.
The 16 KiB context and 32 KiB whole-input caps, five-question limit, one-call
rule, generation claim/staging, and retry contracts remain unchanged.

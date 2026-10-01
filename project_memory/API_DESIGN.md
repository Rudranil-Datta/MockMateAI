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

Uploads a supported resume, creates owned `pending` metadata, and performs bounded local text extraction before responding. The safe response reports `completed` or `failed`; a failed extraction preserves the owned upload for a future retry and never returns parser details.

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

Reject missing, empty, unsupported, invalid-signature, oversized, multiple, or unexpected-field uploads before persistence. Multiple or unexpected files return `400 INVALID_RESUME_UPLOAD`; unsupported types return `415`, and oversized files return `413`. Local extraction rejects documents above 20 pages, processes accepted pages one at a time, stops normalized accumulation at 50,000 characters, and runs in a resource-limited worker that is terminated before a 5-second timeout is reported. Treat malformed, password-protected, image-only, empty-text, timed-out, crashed, or resource-exhausted parsing as a safe recoverable `failed` state. Do not return extracted resume text, extraction details, or internal storage references.

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

The route returns only safe persisted session fields and applies ownership filtering before reading. Private generation/evaluation keys, claims, staged output, and lease state are never returned.

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

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

Reject missing, empty, unsupported, invalid-signature, oversized, multiple, or unexpected-field uploads before persistence. Multiple or unexpected files return `400 INVALID_RESUME_UPLOAD`; unsupported types return `415`, and oversized files return `413`. Treat malformed, password-protected, image-only, empty-text, or timed-out parsing as a safe recoverable `failed` state. Do not return extracted resume text, extraction details, or internal storage references.

### `GET /api/resumes`

**Planned for Day 23; not implemented yet.**

Returns the authenticated user's resume metadata, newest first. Protected route.

### `DELETE /api/resumes/:id`

**Planned for Week 5 resume management; not implemented yet.**

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

**Planned for Day 27; not implemented yet.**

Recommended dedicated voice route for clarity. Validates and transcribes an audio answer, then runs the same evaluation flow.

- Content type: `multipart/form-data`
- Required fields: `questionId`, `audio`
- Protected route.

```json
// 200 response
{
  "answer": {
    "id": "...",
    "inputMode": "voice",
    "text": "Transcribed answer text",
    "submittedAt": "2026-09-02T00:00:00.000Z"
  },
  "feedback": {
    "overallScore": 80,
    "accuracyScore": 82,
    "clarityScore": 78,
    "confidenceScore": 75,
    "strengths": [],
    "improvements": [],
    "nextStep": "..."
  }
}
```

If implementation instead uses the same answers endpoint, retain these validation and response semantics. A transcription failure returns a clear retryable error and must not create evaluated feedback from unusable text.

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

**Planned for Day 24; not implemented yet.**

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
  "recentSessions": [
    {
      "id": "...",
      "interviewType": "DSA",
      "completedAt": "2026-09-02T00:00:00.000Z",
      "overallScore": 82
    }
  ],
  "trend": [
    { "date": "2026-08-27", "overallScore": 72 },
    { "date": "2026-09-02", "overallScore": 82 }
  ]
}
```

The endpoint reads only the authenticated user's completed sessions. It returns an empty, well-formed summary when no sessions are complete.

## Cross-Cutting Requirements

- Validate all input on the server, regardless of frontend validation.
- Rate-limit or otherwise cap question generation, evaluations, and uploads during development.
- Set request timeouts for AI calls and provide clear UI retry states.
- Keep Gemini/OpenAI API keys and database credentials only in backend environment variables.
- Log safe operational identifiers/statuses, not passwords, secrets, or unnecessary resume/answer contents.
- Label returned evaluation as interview-practice feedback, not an automated hiring determination.

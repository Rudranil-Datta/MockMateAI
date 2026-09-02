# V1 API Design — AI-Powered Interview Preparation Platform

## Conventions

- Base path: `/api`.
- Format: JSON for standard requests/responses; `multipart/form-data` for file/audio uploads.
- Authentication: use the application's secure session or token mechanism. Protected routes require an authenticated user.
- Authorization: every resource route verifies that the record belongs to the authenticated user.
- IDs: MongoDB ObjectIds represented as strings.
- Timestamps: ISO 8601 UTC strings.
- The React frontend calls this API only; it never calls MongoDB or OpenAI directly.

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

| Status | Meaning |
| --- | --- |
| `200` | Successful read/update/action. |
| `201` | Resource created. |
| `400` | Invalid request or invalid state transition. |
| `401` | Missing or invalid authentication. |
| `403` | Authenticated but not permitted. |
| `404` | Resource not found (including safely hidden foreign resources). |
| `409` | Duplicate/conflicting state, such as an existing email. |
| `413` | Upload exceeds configured size limit. |
| `415` | Unsupported upload type. |
| `422` | Valid request format but unusable content, such as blank transcription. |
| `429` | Rate or development-usage limit reached. |
| `500` | Unexpected server error. |
| `502` / `504` | Upstream AI service failed or timed out; return a retryable safe message. |

Raw database, provider, and stack errors must not be exposed to clients.

## Authentication

### `POST /api/auth/signup`

Creates an account.

```json
// request
{ "name": "Asha Kumar", "email": "asha@example.com", "password": "user-selected-secret" }

// 201 response
{ "user": { "id": "...", "name": "Asha Kumar", "email": "asha@example.com", "profile": {} } }
```

Validate normalized unique email and password policy. Hash the password before storage. Establish auth state according to the chosen secure session/token approach.

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
{ "user": { "id": "...", "name": "Asha Kumar", "email": "asha@example.com", "profile": { "experienceLevel": "intermediate" } } }
```

## Resumes

### `POST /api/resumes`

Uploads a supported resume and extracts usable text.

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

Reject unsupported or oversized uploads before processing. Do not return extracted resume text by default.

### `GET /api/resumes`

Returns the authenticated user's resume metadata, newest first. Protected route.

### `DELETE /api/resumes/:id`

Optional but recommended for privacy. Deletes an owned resume under the documented reference/retention policy. Protected route.

## Interviews

### `POST /api/interviews`

Creates an active interview session and returns its first question.

```json
// request
{
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

Accept only `DSA`, `HR`, and `System Design`. Confirm `resumeId`, if present, belongs to the user. If question generation fails, return a safe retryable error and do not present a non-existent question as active.

### `POST /api/interviews/:id/questions`

Generates/retrieves the next question for an owned active session.

```json
// 200 response
{ "question": { "id": "...", "order": 2, "prompt": "..." } }
```

Reject completed sessions and enforce the configured V1 question limit.

### `POST /api/interviews/:id/answers`

Submits a typed answer and returns evaluated feedback.

```json
// request
{ "questionId": "...", "text": "A stack is LIFO, while a queue is FIFO." }

// 200 response
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

Confirm session/question ownership and active state. Validate non-empty text and all returned feedback fields before saving/returning them.

### `POST /api/interviews/:id/voice-answers`

Recommended dedicated voice route for clarity. Validates and transcribes an audio answer, then runs the same evaluation flow.

- Content type: `multipart/form-data`
- Required fields: `questionId`, `audio`
- Protected route.

```json
// 200 response
{
  "answer": { "id": "...", "inputMode": "voice", "text": "Transcribed answer text", "submittedAt": "2026-09-02T00:00:00.000Z" },
  "feedback": { "overallScore": 80, "accuracyScore": 82, "clarityScore": 78, "confidenceScore": 75, "strengths": [], "improvements": [], "nextStep": "..." }
}
```

If implementation instead uses the same answers endpoint, retain these validation and response semantics. A transcription failure returns a clear retryable error and must not create evaluated feedback from unusable text.

### `GET /api/interviews/:id`

Returns one owned session, including questions, submitted answers, feedback, and summary when present. Protected route.

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

Reject attempts to complete another user's session or an already completed session unless the endpoint is explicitly designed to be idempotent.

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
  "recentSessions": [
    { "id": "...", "interviewType": "DSA", "completedAt": "2026-09-02T00:00:00.000Z", "overallScore": 82 }
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
- Keep AI API keys and database credentials only in backend environment variables.
- Log safe operational identifiers/statuses, not passwords, secrets, or unnecessary resume/answer contents.
- Label returned evaluation as interview-practice feedback, not an automated hiring determination.

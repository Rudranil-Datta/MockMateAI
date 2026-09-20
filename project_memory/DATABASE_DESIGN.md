# V1 Database Design — AI-Powered Interview Preparation Platform

## Design Approach

V1 uses MongoDB. The recommended design keeps each short interview's questions, answers, and feedback embedded in its `interviewSessions` document. This makes the primary flow—load one user's session and its results—simple and efficient for the intended limited interview length.

Separate collections are used for users and resumes because they have independent lifecycles. The design may extract answers into their own collection later if sessions grow substantially; V1 should not do so without a demonstrated need.

## Collection Overview

| Collection          | Purpose                                                          | Primary relationship                          |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `users`             | Accounts and basic interview preferences                         | Owns resumes and interview sessions           |
| `resumes`           | Resume metadata, controlled file reference, and extracted text   | Belongs to one user                           |
| `interviewSessions` | Interview setup, questions, answers, feedback, and final summary | Belongs to one user; may reference one resume |

All application records include `createdAt` and `updatedAt` timestamps. IDs below are MongoDB `ObjectId` values unless otherwise stated.

## `users`

### Purpose

Stores account identity, securely hashed authentication data, and only the profile/preference data needed to tailor practice.

### Shape

```js
{
  _id: ObjectId,
  name: String,                         // required, trimmed
  email: String,                        // required, lowercase, unique
  passwordHash: String,                 // required; never return in an API response
  profile: {
    targetRole: String,                 // optional, e.g. "Backend Developer"
    experienceLevel: String             // optional: beginner | intermediate | advanced
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Validation and indexes

- Require a non-empty name, valid normalized email of at most 254 characters, and password meeting the team's chosen minimum policy.
- Store only a strong password hash (for example, bcrypt or Argon2 output); never store a plain password.
- Unique index: `{ email: 1 }`.
- Return a safe projection from APIs: `_id`, `name`, `email`, `profile`, timestamps. Exclude `passwordHash` always.

## `resumes`

### Purpose

Represents a resume uploaded by a user and the extracted text that can be used as bounded interview context.

### Shape

```js
{
  _id: ObjectId,
  userId: ObjectId,                     // required; references users._id
  originalName: String,                 // required
  mimeType: String,                     // required; allow-list only
  sizeBytes: Number,                    // required; positive and capped
  storage: {
    provider: String,                   // e.g. local-dev or configured object store
    key: String                          // controlled internal file reference
  },
  extractedText: String,                // required after successful extraction
  extractionStatus: String,             // pending | completed | failed
  extractionError: String,              // optional, safe operational message only
  createdAt: Date,
  updatedAt: Date
}
```

### Validation and indexes

- Validate authentication, ownership, content type, file extension/signature as appropriate, and the 5 MiB upload/extraction file limit before saving or extracting.
- `userId` is required and must be taken from the authenticated request—not a client-supplied ownership field.
- Reject PDFs above 20 pages. Extract accepted pages sequentially and stop normalized accumulation at 50,000 characters; the model independently rejects blank or oversized completed text. `completed` requires extracted text; `failed` stores only the safe operational message needed for recovery.
- Index: `{ userId: 1, createdAt: -1 }` for a user's resume list.
- Do not return `extractedText` unless the client genuinely needs it; question generation reads it only on the backend.

## `interviewSessions`

### Purpose

Stores one complete DSA, HR, or System Design practice attempt. Embedded questions and answers keep session retrieval, completion, and dashboard aggregation straightforward for V1.

### Shape

```js
{
  _id: ObjectId,
  userId: ObjectId,                     // required; references users._id
  interviewType: String,                // required: DSA | HR | System Design
  level: String,                        // required: beginner | intermediate | advanced
  resumeId: ObjectId,                   // optional; references an owned resume
  startRequestId: String,               // optional legacy-safe unique per-user start idempotency key
  status: String,                       // created | active | completed
  questionGeneration: {                 // present only while bounded generation is claimed
    claimId: String,
    idempotencyKey: String,
    expectedQuestionCount: Number,
    startedAt: Date,
    prompt: String                       // optional validated output retained across final-write retry
  },
  questions: [
    {
      _id: ObjectId,
      order: Number,
      generationKey: String,            // idempotency key; omitted from API responses
      prompt: String,
      generatedAt: Date,
      answers: [
        {
          _id: ObjectId,
          inputMode: String,            // text | voice
          text: String,                 // typed or transcribed answer
          voiceStorageKey: String,      // optional; retain only if configured
          submittedAt: Date,
          evaluationKey: String,        // client operation UUID; omitted from API responses
          evaluationStatus: String,     // not_started | pending | completed
          evaluationClaimId: String,    // private current-claim owner; pending only
          evaluationStartedAt: Date,    // private 30-second recovery lease timestamp
          evaluationOutput: {           // private validated output staged across final-write retry
            overallScore: Number,
            accuracyScore: Number,
            clarityScore: Number,
            confidenceScore: Number,
            strengths: [String],
            improvements: [String],
            nextStep: String,
            evaluatedAt: Date
          },
          feedback: {
            overallScore: Number,       // recommended range: 0–100
            accuracyScore: Number,      // 0–100
            clarityScore: Number,       // 0–100
            confidenceScore: Number,    // 0–100; assessment of response, not emotion diagnosis
            strengths: [String],
            improvements: [String],
            nextStep: String,
            evaluatedAt: Date
          }
        }
      ]
    }
  ],
  summary: {
    overallScore: Number,
    accuracyScore: Number,
    clarityScore: Number,
    confidenceScore: Number,
    strengths: [String],
    improvements: [String],
    recommendation: String
  },
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Validation rules

- Set `userId` exclusively from authenticated middleware.
- Allow only `DSA`, `HR`, and `System Design` for `interviewType`.
- Allow only the selected supported levels for `level`.
- A referenced `resumeId` must exist and belong to the same user.
- Require an active session and a non-empty answer text before evaluation.
- Accept feedback only after server-side validation of its structured shape and score ranges.
- Persist only the first answer text for a question. Repeated evaluation requests must use the same operation UUID; a completed replay returns the same saved result.
- A `pending` evaluation requires a private claim ID and start time. Only that claim may stage output, complete, or release itself; claims older than 30 seconds may be replaced.
- A recoverable non-completed answer may retain private validated `evaluationOutput` after final feedback persistence fails. Completion moves that output to `feedback` and removes all private claim/output fields.
- Set top-level `completedAt` and `summary` only when the session transitions to `completed`. A completed session requires at least one evaluated answer and cannot retain pending/staged evaluation or question-generation work; `completedAt` cannot precede `startedAt`.
- Cap question and answer counts to the defined V1 interview length so documents stay small and predictable.

### Indexes

| Index                                             | Reason                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `{ userId: 1, createdAt: -1 }`                    | Retrieve a user's recent history.                                                 |
| `{ userId: 1, status: 1, updatedAt: -1 }`         | Find active/completed sessions efficiently.                                       |
| `{ userId: 1, completedAt: -1 }`                  | Support dashboard history and trend queries.                                      |
| `{ resumeId: 1 }`                                 | Optional: locate sessions related to a resume.                                    |
| `{ userId: 1, startRequestId: 1 }` unique partial | Deduplicate retry/replay of interview creation without affecting legacy sessions. |

## Relationships and Ownership

```text
users (1) ────< resumes (many)
  │
  └────< interviewSessions (many) >──── (0..1) resumes
                 └──── embedded questions → answers → feedback
```

Every protected read, update, or delete query must include the authenticated `userId`. For example, retrieve a session using both `_id` and `userId`, rather than fetching by `_id` and checking ownership later.

## Analytics Queries

The dashboard reads only completed sessions for the authenticated user. For V1, a MongoDB aggregation can calculate:

- total completed sessions;
- recent sessions with type, date, and overall score;
- average overall and dimension scores;
- score averages grouped by interview type;
- a simple time-ordered score trend.

The database should be the source of truth. Do not persist a duplicate dashboard aggregate in the user document unless profile-scale testing proves it is necessary.

## Data Retention and Deletion

- Retain only data needed for the V1 demo and its dashboard.
- If resume deletion is offered, verify ownership, remove controlled file storage where applicable, and either block deletion when referenced or safely clear the `resumeId` reference while retaining session results.
- If session deletion is offered, verify ownership and remove any separately retained voice-file reference associated with the session.
- Never cascade-delete a user without an explicit, tested account-deletion workflow.

## Out of Scope for V1

Separate collections for question-bank administration, payments, employers, jobs, recruiters, proctoring signals, detailed AI prompt logs, and advanced event analytics are not required.

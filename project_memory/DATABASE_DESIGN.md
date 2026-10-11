# V1 Database Design — AI-Powered Interview Preparation Platform

## Design Approach

V1 uses MongoDB. The recommended design keeps each short interview's questions, answers, and feedback embedded in its `interviewSessions` document. This makes the primary flow—load one user's session and its results—simple and efficient for the intended limited interview length.

Separate collections are used for users and resumes because they have independent lifecycles. The design may extract answers into their own collection later if sessions grow substantially; V1 should not do so without a demonstrated need.

## Collection Overview

| Collection          | Purpose                                                          | Primary relationship                          |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `users`             | Accounts and basic interview preferences                         | Owns resumes and interview sessions           |
| `resumes`           | Resume metadata and extracted text                               | Belongs to one user                           |
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

- Require a non-empty name and normalized signup email of at most 254
  characters: one local part, `@`, valid DNS-style domain labels, and a final
  alphabetic suffix of 2–63 characters. This is syntax validation, not mailbox
  verification.
- New or replacement passwords require 15–72 UTF-8 bytes, at least one number or
  punctuation/symbol character, no control/format characters, and must not
  match normalized account email or name. Password replacement also requires
  current-password proof, exact confirmation, and rejects a match to the current
  hash. Do not trim or silently truncate passwords. Existing stored password
  hashes remain compatible with login.
- Authenticated profile updates may change only `name`, `profile.targetRole`,
  and `profile.experienceLevel`; email and `passwordHash` are never writable by
  this profile operation.
- Store only a strong password hash (for example, bcrypt or Argon2 output); never store a plain password.
- Unique index: `{ email: 1 }`; it is the final authority for concurrent
  duplicate-account rejection after lowercase normalization.
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
  storage: {                             // optional legacy field; not written by new uploads
    provider: String,
    key: String
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
- Reject PDFs above 20 pages. Extract accepted pages sequentially and stop normalized accumulation at 50,000 characters; the model independently rejects blank or oversized completed text. `completed` requires extracted text; `failed` stores only a safe operational message. Delete the temporary raw PDF on every request outcome; a failed extraction requires re-upload.
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
  sessionPurpose: String,               // optional: standard | targeted_practice
  focusSkillKey: String,                // optional normalized V2 skill key
  resumeId: ObjectId,                   // optional; references an owned resume
  startRequestId: String,               // optional legacy-safe unique per-user start idempotency key
  status: String,                       // created | active | completed
  questionGeneration: {                 // present only while bounded generation is claimed
    claimId: String,
    idempotencyKey: String,
    expectedQuestionCount: Number,
    startedAt: Date,
    prompt: String,                      // optional validated output retained across final-write retry
    decision: {                          // optional complete private adaptive decision
      prompt: String,
      topicKey: String,
      testedSkillKeys: [String],
      difficulty: String,
      parentQuestionOrder: Number | null,
      decisionType: String,
      reasonCode: String
    }
  },
  questions: [
    {
      _id: ObjectId,
      order: Number,
      generationKey: String,            // idempotency key; omitted from API responses
      prompt: String,
      topicKey: String,                  // optional; present only with complete V2 metadata
      testedSkillKeys: [String],         // optional 1–3 normalized unique keys
      difficulty: String,                // optional beginner | intermediate | advanced
      parentQuestionId: ObjectId,        // optional earlier same-session question
      decisionType: String,              // optional bounded adaptive decision enum
      reasonCode: String,                // optional bounded safe reason enum
      generatedAt: Date,
      voiceTranscription: {             // private temporary handoff; never returned
        claimId: String,                // processing only
        idempotencyKey: String,
        mimeType: String,
        startedAt: Date,                // processing only
        completedAt: Date,
        status: String,                 // processing | completed
        text: String                    // validated transcript; consumed on answer creation
      },
      answers: [
        {
          _id: ObjectId,
          inputMode: String,            // text | voice
          text: String,                 // typed or transcribed answer
          voiceStorageKey: String,      // optional schema field; unset for V1 voice answers
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
- For voice input, atomically consume only a matching owned completed `voiceTranscription` into one `inputMode: "voice"` answer, then remove the private handoff. Preserve exact validated transcript text and operation UUID; never persist raw audio or `voiceStorageKey` in the V1 flow.
- Voice evaluation uses the same answer claim, staged-output, finalization, replay, and stale-lease rules as typed evaluation. A failed evaluation leaves the saved voice answer retryable without retranscription.
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

## V2 Data Additions

V2 remains on MongoDB and extends the current design additively. No relational or
graph database and no mandatory backfill are planned.

Exact Day 1 field bounds, enums, indexes, immutable snapshot rules, evidence
identity, and mastery derivation are frozen in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). No migration or backfill is
authorized by that documentation contract.

| Collection          | Planned purpose                                                                                                | Ownership/integrity rule                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `jobTargets`        | Bounded role, optional company, JD, validated requirements, and prioritized skills.                            | Every query includes authenticated `userId`; analysis failure cannot produce a misleading confirmed summary. |
| `candidateProjects` | User-confirmed project facts, technologies, responsibilities, architecture, decisions, trade-offs, and claims. | Resume extraction returns drafts only; persistence/use requires explicit confirmation.                       |
| `skillEvidence`     | Immutable answer-linked categorical evidence used to derive mastery and improvement.                           | Unique per owned answer/skill evidence identity; never accept an LLM-written final mastery value.            |

### Day 2 implemented `jobTargets`

`jobTargets` now implements the Day 1 source fields, exact analysis shape,
`analysis_pending|ready|analysis_failed` lifecycle, timestamps, and indexes:
`{userId,updatedAt}`, `{userId,status,updatedAt}`, and unique
`{userId,analysisRequestId}`. Private `analysisClaimId` and
`analysisStartedAt` exist only during pending analysis and use a 30-second stale
lease. Ready records alone contain analysis; failed records alone contain a
safe `quota|timeout|unavailable|invalid_response` category. All service queries
include `userId`; no backfill or migration was required.

### Day 3 implemented `candidateProjects`

`candidateProjects` now stores only explicitly confirmed facts with the exact
Day 1 string, array, uniqueness, claim, and 16 KiB serialized bounds. It stores
optional owned completed `sourceResumeId`, server-written `confirmedAt`, and
timestamps. Indexes are `{userId,updatedAt}` and `{userId,confirmedAt}`.
Every read/update/delete filters by authenticated owner; extraction drafts stay
only in bounded process memory and never enter MongoDB. No migration or backfill
was required. Deleting an owned resume detaches only its owned optional
`sourceResumeId` links; it never deletes/downgrades candidate projects or
cascades to interview history/snapshots.

Day 4 added optional `sessionPurpose`, `focusSkillKey`, complete optional
question metadata, and complete private adaptive-decision staging. Metadata is
stored as one valid group; parent IDs must reference an earlier same-session
question. Existing documents require no migration or backfill.

Day 6 adds optional `jobTargetId` and an analysis-only `contextSnapshot` for
Role Simulation. The snapshot stores `kind="job_target"`, matching source ID,
source update time, display label, role summary, requirements, and skills, with
a 16 KiB serialized cap. The interview-type enum now includes Role Simulation
while preserving the three V1 values.

Day 7 adds optional `projectId` and `kind="candidate_project"` snapshot facts
for Project Defense. Facts contain only the confirmed project contract fields;
source resume ID, confirmation time, raw resume text, and provider payloads are
excluded. Project ID must match snapshot source ID, and the complete snapshot
envelope remains within 16 KiB. Existing sessions require no migration.

Day 8 adds optional paired `challengeAxis` and `challengeAnchorKey` to a
question and its private staged adaptive decision. Allowed axes are
architecture, technology, data, security, testing, deployment, trade-off, and
failure-scenario. Anchor keys identify an indexed field inside the existing
immutable project snapshot; anchor/answer text is not duplicated in question
metadata. The pair is valid only on a parent-linked Project Defense follow-up.
Historical questions remain valid without it; no migration or backfill exists.

Day 9 adds immutable `skillEvidence` records after completed V2 answer feedback.
Each record stores only owner, session/question/answer identity, normalized key
and label, categorical outcome, difficulty, evidence strength, safe reason
code, and server `createdAt`. Indexes are unique `{userId,answerId,skillKey}`;
`{userId,skillKey,createdAt:-1}`; and `{userId,sessionId}`. No raw answer,
prompt, feedback text, final mastery score, or unvalidated provider payload is
stored.
V2 sessions add private staged categorical output and `evidenceSyncStatus`.
After idempotent evidence upsert succeeds, staging is removed and status becomes
`ready`; failed writes retain staging with `pending`. No migration or backfill
exists.

Existing sessions without V2 fields remain valid. Derived skill profiles use
recent owned `skillEvidence`, deterministic categorical value mapping, bounded
difficulty/evidence-strength/recency weights, attempt count, and an explicit
provisional state when evidence is sparse. Source Target/Project deletion must
not break a saved session snapshot or replay.

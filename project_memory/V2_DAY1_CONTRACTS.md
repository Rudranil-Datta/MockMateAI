# V2 Day 1 Contract Freeze

## Status and Scope

**Status:** Approved Day 1 documentation contract. No V2 application behavior is
implemented by this document.

This is the decision-complete implementation contract for V2 Days 2–15. It
refines the V2 plan without changing its scope. Existing V1 request/response
shapes remain authoritative until the owning V2 day is implemented and
verified. A later change to a required field, lifecycle, formula, security
bound, or compatibility rule is a documented deviation and needs explicit user
approval.

## V1 Compatibility Map

| V2 capability       | Existing V1 boundary to extend                                       | Compatibility rule                                                            | Owning day |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| Job Targets         | Auth, safe errors, AI provider service, rate limits                  | New owned resource; no V1 response changes                                    | 2          |
| Candidate Projects  | Completed-resume ownership/extraction                                | Extraction returns unsaved drafts; no Resume schema change                    | 3          |
| New interview types | `InterviewSession`, interview validators/service/routes, Practice UI | Add enum values and optional fields; all three V1 types keep exact behavior   | 4–8        |
| Adaptive questions  | Question-generation claim/idempotency and provider adapters          | V1 questions may omit V2 metadata; five-question and one-answer caps remain   | 4–6        |
| Skill evidence      | Completed answer/evaluation flow and analytics                       | New immutable collection; existing feedback and analytics payloads stay exact | 9–11       |
| Targeted practice   | Existing interview lifecycle                                         | `sessionPurpose=targeted_practice`; no separate session engine                | 10         |
| Replay/UI upgrade   | Existing result, dashboard, shell, and API wrappers                  | New V2 endpoints/components; legacy records render with fallback labels       | 11–13      |

Known strict-client constraints are part of the implementation contract:

- `analyticsApi` exact-key validation means V2 readiness data uses
  `GET /api/skills/profile`; it is not added to `GET /api/analytics/summary`.
- Voice answer validation requires the exact existing `{answer, feedback}`
  shape. Skill synchronization therefore does not add response keys there.
- V1 start, answer, completion, analytics, and replay payloads remain unchanged
  for DSA, HR, and System Design. V2-only question/session metadata is optional
  on reads and emitted only when present.
- Existing records need no backfill. Missing `sessionPurpose` means `standard`;
  missing adaptive metadata means `legacy`; missing snapshots means no V2
  context.

### Planned implementation boundaries

| Boundary            | Current V1 files to extend                                                                     | New focused files planned                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Composition/routes  | `server/src/app.js`, interview routes/controllers                                              | Job Target, Project, and Skill route/controller modules                          |
| Persistence         | `server/src/models/InterviewSession.js`, `Resume.js` ownership patterns                        | `JobTarget.js`, `CandidateProject.js`, `SkillEvidence.js`                        |
| Validation/provider | `interviewSchemas.js`, `aiSchemas.js`, `aiProviderService.js`, Gemini/mock adapters            | Resource validators plus V2 provider schemas                                     |
| Domain services     | `interviewService.js`, `answerEvaluationService.js`, `resumeService.js`, `analyticsService.js` | Job Target, Candidate Project, adaptive-decision, evidence, and mastery services |
| Client APIs/routes  | `interviewApi.js`, `analyticsApi.js`, `resumeApi.js`, `App.jsx`                                | Target, Project, and Skill API wrappers/pages                                    |
| Existing UI         | `PracticePage.jsx`, `InterviewResultPage.jsx`, `DashboardPage.jsx`, `AppShell.jsx`             | Focused setup/cockpit/replay/readiness components as justified by each day       |
| Verification        | Adjacent server unit/integration tests and client API/page tests                               | One focused test file per new resource/service/page boundary where useful        |

Controllers remain thin, routes declarative, models persistence-only, and
provider SDK use adapter-only. Exact new filenames are confirmed against the
tree on the owning day; ownership does not move to a new architecture layer.

The provider-neutral interface preserves V1 `generateQuestion` and
`evaluateAnswer`. V2 adds `analyzeJobTarget`, `extractProjectDrafts`,
`generateAdaptiveQuestion`, and `evaluateV2Answer`. `evaluateV2Answer` returns
the existing feedback object plus 1–3 private categorical evidence proposals in
one provider operation; the service exposes the unchanged V1 answer response.
Both mock and Gemini adapters must satisfy the same validated contracts.

## Shared Conventions

- IDs are MongoDB ObjectId strings. `idempotencyKey` is a UUID matching the V1
  pattern and is at most 100 characters.
- All strings are trimmed. Unknown request keys are rejected. Arrays reject
  duplicates after case-insensitive normalization.
- List endpoints return at most 50 owned items, newest first, as
  `{ "items": [...] }`. V2 does not add pagination in this release.
- Protected lookups always include authenticated `userId`. Invalid IDs return
  `400 VALIDATION_ERROR`; missing and foreign-owned IDs both return the same
  resource-specific `404`.
- Create returns `201`; reads and patches return `200`; delete returns `204`;
  validation is `400`; state/idempotency conflict is `409`; quota is `429`; a
  safe provider failure is `502` or `503` under the existing error mapping.
- Dates are server-written ISO instants. Clients never supply ownership,
  analysis state, snapshots, evidence, mastery, timestamps, or provider data.

## Job Target Contract

### Persistence

`jobTargets` contains:

| Field                    | Contract                                                                  |
| ------------------------ | ------------------------------------------------------------------------- |
| `userId`                 | Required owner reference                                                  |
| `title`                  | Required text, 2–120 characters                                           |
| `company`                | Optional text, 2–120 characters when present                              |
| `description`            | Required text, 100–12,000 characters                                      |
| `status`                 | `analysis_pending`, `ready`, or `analysis_failed`                         |
| `analysis`               | Present only for `ready`; exact shape below                               |
| `analysisRequestId`      | Required UUID used for duplicate prevention                               |
| `analysisFailureCode`    | Optional safe enum: `quota`, `timeout`, `unavailable`, `invalid_response` |
| `analysisClaimId`        | Private pending-only UUID; never returned                                 |
| `analysisStartedAt`      | Private pending-only start time for the 30-second stale lease             |
| `createdAt`, `updatedAt` | Server timestamps                                                         |

The exact analysis is:

- `roleSummary`: 20–500 characters.
- `requirements`: 1–12 unique entries, each with `key` (lowercase slug, 2–50),
  `label` (2–80), `priority` (`required`, `preferred`, `context`), and
  `evidenceTerms` (0–5 strings, each 2–80).
- `skills`: 1–12 unique entries, each with the same bounded `key` and `label`,
  `weight` integer 1–5, and `sourceRequirementKeys` containing 1–5 known keys.
- Total serialized analysis is at most 12 KiB.

Indexes are `{userId:1, updatedAt:-1}`, `{userId:1, status:1,
updatedAt:-1}`, and unique `{userId:1, analysisRequestId:1}`.

Day 2 implemented these additive private lease fields to prevent a crashed
analysis from remaining permanently pending. This approved recovery refinement
does not change the public Job Target shape.

### Lifecycle and API

- `POST /api/job-targets` accepts exactly `idempotencyKey`, `title`, optional
  `company`, and `description`. It creates/claims `analysis_pending`, performs
  one bounded analysis, validates the output, then makes the record `ready`.
  Same key/same input returns the existing result; same key/different input
  returns `409 IDEMPOTENCY_KEY_REUSED`.
- Provider failure leaves a truthful retryable `analysis_failed` record without
  `analysis`; the response uses the existing safe provider error. It never
  creates a fabricated ready target.
- `POST /api/job-targets/:id/analyze` accepts exactly `idempotencyKey` and is
  allowed only for `analysis_failed`. Concurrent analysis returns
  `409 JOB_TARGET_ANALYSIS_IN_PROGRESS`.
- `GET /api/job-targets` and `GET /api/job-targets/:id` return owned records.
- `PATCH /api/job-targets/:id` accepts at least one of `title`, `company`, or
  `description` plus `idempotencyKey`. A material edit reruns analysis through
  the same lifecycle; clearing company uses `company:null`.
- `DELETE /api/job-targets/:id` deletes only the source. It does not delete or
  rewrite session snapshots or evidence.
- A Role Simulation can use only a `ready` owned target. Otherwise return
  `409 JOB_TARGET_NOT_READY`; absent/foreign returns
  `404 JOB_TARGET_NOT_FOUND`.

## Candidate Project Contract

### Unsaved extraction

`POST /api/projects/extract` accepts exactly `idempotencyKey` and an owned
completed `resumeId`. It returns `{drafts:[...]}` with 0–5 drafts and never
writes a Candidate Project. Each draft has the editable project shape below
plus `sourceResumeId` and `source="resume_suggestion"`. Empty extraction is a
successful empty list. Malformed output is rejected; it is never repaired into
facts. Duplicate request handling uses a bounded process-local cache only, so
no private draft content is persisted.

### Confirmed persistence

`candidateProjects` contains only user-confirmed facts:

| Field                    | Contract                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `userId`                 | Required owner reference                                                           |
| `name`                   | Required, 2–120 characters                                                         |
| `summary`                | Required, 20–1,000 characters                                                      |
| `role`                   | Required, 2–120 characters                                                         |
| `technologies`           | 1–15 unique strings, each 1–50 characters                                          |
| `responsibilities`       | 1–10 unique strings, each 5–300 characters                                         |
| `architecture`           | 1–10 unique strings, each 5–300 characters                                         |
| `decisions`              | 0–8 unique strings, each 5–300 characters                                          |
| `tradeoffs`              | 0–8 unique strings, each 5–300 characters                                          |
| `claims`                 | 0–8 entries `{text,evidence}`, each value 5–300 characters; `evidence` may be null |
| `sourceResumeId`         | Optional owned completed Resume reference                                          |
| `confirmedAt`            | Required server time                                                               |
| `createdAt`, `updatedAt` | Server timestamps                                                                  |

Total serialized confirmed project facts are at most 16 KiB. Indexes are
`{userId:1, updatedAt:-1}` and `{userId:1, confirmedAt:-1}`.

- `POST /api/projects` accepts exactly the editable fields, optional
  `sourceResumeId`, and `confirmed:true`. Missing/false confirmation is
  `400 PROJECT_CONFIRMATION_REQUIRED`.
- `GET /api/projects` and `GET /api/projects/:id` expose only owned confirmed
  projects. `PATCH /api/projects/:id` requires the complete editable project
  shape plus `confirmed:true`; confirmation time is refreshed because the user
  re-attests the full record.
- `DELETE /api/projects/:id` deletes only the source. Existing session snapshots
  remain immutable.
- Project Defense requires an owned confirmed project. Missing/foreign is
  `404 PROJECT_NOT_FOUND`; a structurally invalid legacy project is
  `409 PROJECT_NOT_READY`.

Day 3 implemented this contract with a separate 8,000-character normalized
resume context and a private process-local extraction cache/in-flight map using
a 60-second TTL and 100-entry deterministic oldest-entry ceiling. These fixed
safety bounds evict the oldest completed entry; if all entries are in flight,
new extraction fails safely instead of weakening duplicate prevention. They
require no environment or deployment configuration. The existing V1
2,000-character question context remains unchanged.

## Interview and Snapshot Contract

`POST /api/interviews` keeps its V1 fields and adds only:

| Field            | Rule                                                           |
| ---------------- | -------------------------------------------------------------- |
| `interviewType`  | Adds `Role Simulation`, `Project Defense`                      |
| `jobTargetId`    | Required only for Role Simulation; forbidden otherwise         |
| `projectId`      | Required only for Project Defense; forbidden otherwise         |
| `sessionPurpose` | Optional `standard` or `targeted_practice`; default `standard` |
| `focusSkillKey`  | Required only for targeted practice; normalized skill slug     |

Targeted practice uses one of the five interview types plus one owned skill key
already present in the user's evidence. It cannot bypass a required Job Target
or Project. Unsupported field combinations return `400 VALIDATION_ERROR`.
Start-idempotency equality includes every V2 field.

New session fields are optional for legacy compatibility:

- `sessionPurpose`; `focusSkillKey`; owned `jobTargetId` or `projectId`.
- `contextSnapshot` with `kind` (`job_target` or `candidate_project`), source
  ID, source `updatedAt`, display label, and only the bounded analysis/facts
  defined above. Snapshot maximum is 16 KiB.
- `skillContextSnapshot`: at most 5 entries `{key, masteryScore,
confidenceLabel}`, copied at session creation.
- `evidenceSyncStatus`: `not_applicable`, `pending`, or `completed`; absent on
  V1 sessions and derived as `not_applicable` for display.
- Each V2 answer may hold private `skillEvidenceOutput` with 1–3 fully validated
  categorical entries while synchronization is pending. It is staged in the
  same session update that completes feedback, is never returned by V1 answer
  responses, and is removed only after idempotent evidence writes succeed.

Each V2 question adds `topicKey` (slug), `testedSkillKeys` (1–3 unique slugs),
`difficulty`, optional `parentQuestionId`, `decisionType`, and `reasonCode`.
The read API emits these keys only when stored. Parent IDs must reference an
earlier question in the same session. Source edits/deletion never mutate a
snapshot.

Context precedence is: current answer and feedback; required confirmed
Target/Project snapshot; `focusSkillKey`; at most five prior question summaries;
at most five derived skill summaries; optional bounded resume context. Lower
precedence context is dropped first when a cap is reached. Raw full history,
unconfirmed drafts, and unrelated resume sections are forbidden.

## Adaptive Decision Contract

The provider proposes exactly:

- `prompt`: 1–2,000 characters.
- `topicKey`: normalized slug that is present in the frozen coverage plan.
- `testedSkillKeys`: 1–3 known keys.
- `difficulty`: `beginner`, `intermediate`, or `advanced`.
- `decisionType`: `baseline`, `deepen`, `clarify`, `recover`, `switch_topic`,
  or `retest`.
- `reasonCode`: `opening`, `strong_evidence`, `partial_evidence`,
  `weak_evidence`, `missing_evidence`, `coverage_gap`, or `targeted_retest`.
- `parentQuestionOrder`: null or an earlier order.

Backend rules override/reject provider output:

1. Question 1 is `baseline/opening`, except targeted practice may use
   `retest/targeted_retest`.
2. `deepen` requires prior `strong`; `clarify` requires `partial`; `recover`
   requires `weak` or `missing`; `switch_topic` requires a coverage gap.
3. Difficulty changes by at most one level from the preceding question and
   stays inside the session's beginner–advanced range.
4. One answer can trigger at most one `clarify` or `recover` follow-up. The next
   decision must switch topic unless it is the final planned retest.
5. Normalized prompt similarity of 0.85 or greater to an earlier prompt, an
   unknown skill/topic, invalid parent, or inconsistent enum pair is rejected.
6. Exactly five questions remain the hard maximum; early completion after one
   evaluated answer remains supported.
7. Provider timeout/quota/unavailable/invalid output saves no question. The
   existing claim lease/idempotency path preserves a retryable state.

This is finite service orchestration, not an autonomous agent. The model has no
tools, persistence access, loop authority, or hidden state-transition control.

### Day 4 implemented contract refinement

`generateAdaptiveQuestion` now exists behind the shared AI service and both
mock/Gemini adapters, but no interview route invokes it yet. Its exact input
contains the five-type interview enum, level, session purpose, 1–12 unique
coverage entries, 0–5 ordered prior-question summaries, a nullable known focus
skill, and a nullable confirmed-context summary. Context is capped at 16 KiB
and the normalized serialized input at 32 KiB. Unknown keys, topics, skills,
duplicates, invalid parent order, and malformed provider output are rejected.
The method performs one bounded provider operation with no unavailable retry.

`InterviewSession` now accepts optional `sessionPurpose`, `focusSkillKey`, and
complete optional per-question metadata. Private question-generation staging
may retain one complete validated adaptive decision, allowing final-write retry
without another provider call or metadata loss. Prompt-only V1 staging and
metadata-free historical sessions remain valid. At Day 4 completion, Day 5
still owned transition legality, similarity, difficulty-step, coverage,
follow-up, and hard-cap rules.

### Day 5 implemented deterministic refinement

Day 5 derives outcome from saved integer `overallScore` only: `0=missing`,
`1–59=weak`, `60–84=partial`, and `85–100=strong`. Standard openings require
`baseline/opening`; targeted openings require `retest/targeted_retest` and the
focus skill. Strong, partial, weak, and missing outcomes require the documented
deepen, clarify, or recover branch with exact parent/topic and bounded
difficulty. A remediation follow-up or two consecutive same-topic questions
forces a least-used different topic, breaking ties by frozen coverage order.
Single-topic exhaustion returns `ADAPTIVE_SEQUENCE_COMPLETE`; five prior
questions return `QUESTION_LIMIT_REACHED`. Both stop before provider work.

Prompt comparison lowercases text, replaces non-alphanumeric runs with one
space, trims whitespace, and calculates `1 - Levenshtein distance / maximum
normalized length`. Similarity `>=0.85` is rejected. The isolated engine calls
the existing provider-neutral method at most once and has no route,
persistence, retry, loop, tool, or state authority. Days 6–7 activate it for
Role Simulation and Project Defense through the existing session claim/staging
lifecycle, using an owned ready target or owned confirmed project and the
matching immutable bounded snapshot.

### Day 8 implemented Project Defense challenge refinement

Each Project Defense follow-up now has one deterministic directive derived from
the latest saved answer, parent topic, and immutable project snapshot. Allowed
axes are architecture, technology, data, security, testing, deployment,
trade-off, and failure-scenario. The selector uses an explicit claim when the
claimed-results topic applies; otherwise it uses an indexed fact from the
matching project field. Projects without claims therefore remain usable.

The directive contains exact axis, safe anchor key, confirmed anchor text, and
at most 2,000 characters of the latest answer. It remains inside the 32 KiB
adaptive-input cap. Provider output must echo axis/key and visibly include the
exact anchor. Only axis/key persist with the parent-linked question and private
staged decision. Project openings, Role Simulation, V1, and historical
questions omit these fields. Existing cap, branch, difficulty, repetition,
claim, staging, and retry rules remain authoritative.

## Skill Evidence and Mastery Contract

One validated provider evaluation may propose 1–3 evidence entries for a
completed V2 answer. Each immutable `skillEvidence` record contains owner,
session/question/answer IDs, normalized skill key and label, outcome
(`strong`, `partial`, `weak`, `missing`), difficulty, evidence strength
(`direct`, `supporting`), safe reason code, and server `createdAt`. It stores no
raw answer, prompt, provider payload, or final mastery score.

Unique index `{userId:1, answerId:1, skillKey:1}` prevents duplicates. Read
indexes are `{userId:1, skillKey:1, createdAt:-1}` and
`{userId:1, sessionId:1}`. Evidence is accepted only after the answer feedback
is durably completed. A retry upserts the same evidence identity.

Mastery is derived per skill from the newest 20 entries no older than 180 days:

- Outcome values: `strong=100`, `partial=65`, `weak=30`, `missing=0`.
- Difficulty weights: `beginner=0.8`, `intermediate=1.0`, `advanced=1.2`.
- Evidence-strength weights: `direct=1.0`, `supporting=0.75`.
- Recency weights: age 0–30 days `1.0`; 31–90 `0.85`; 91–180 `0.70`.
- `masteryScore = round(sum(value × all weights) / sum(all weights))`, clamped
  to 0–100. Empty evidence yields no score, not zero mastery.
- Labels: 0–39 `needs_work`, 40–69 `developing`, 70–84 `capable`, 85–100
  `strong`.
- Confidence: `provisional` until at least 3 entries across at least 2 sessions;
  then `emerging` for 3–5 entries, `established` for 6 or more. No UI may imply
  hiring probability or certainty.

`GET /api/skills/profile` returns at most 30 skills ordered by mastery ascending,
then evidence count descending, plus one `recommendedAction`. The recommendation
selects the lowest non-established skill, breaking ties by newest evidence,
and gives a targeted-practice link payload. Empty evidence returns
`{skills:[], recommendedAction:null}`.

If feedback succeeds but evidence persistence fails, the answer remains
completed with its private validated `skillEvidenceOutput`, the session becomes
`evidenceSyncStatus=pending`, and the answer response keeps its exact V1 shape.
A later idempotent session read/profile request may reconcile from that staged
categorical output. UI states that feedback is saved but skill insights are
pending; it never claims mastery changed.

## UI Information Architecture and State Contract

Protected routes are:

- Existing `/dashboard`, `/practice`, `/practice/:interviewId/results`,
  `/resumes`, and `/account`.
- New `/targets`, `/targets/new`, `/targets/:targetId/edit`, `/projects`,
  `/projects/new`, `/projects/:projectId/edit`, and `/skills`.

Screen ownership:

- Dashboard: readiness summary, lowest skills, recent sessions, and exactly one
  recommended next action; legacy analytics remain a separate request/state.
- Targets: owned list and create/edit/analyze/delete states.
- Projects: extraction choice, visibly unconfirmed editable drafts, explicit
  confirmation, owned confirmed list, edit/delete.
- Practice setup: five types, level, optional resume, conditional required
  Target/Project, and targeted-practice focus.
- Cockpit: one prompt, progress, topic, difficulty, safe adaptive label, answer
  input, feedback, and next/complete action. No hidden reasoning.
- Result/replay: immutable snapshot label, ordered parent/follow-up chain,
  answers, feedback, skills, difficulty, and later evidence comparison.
- Skills: evidence-derived score/label/confidence, counts, last practiced date,
  and targeted-practice action.

Every async screen has loading, empty, success, validation, permission/not-found,
provider/quota, persistence, retry, and preserved-draft behavior where
applicable. Destructive actions require confirmation. Keyboard order follows
visual order; focus moves to the error summary or new question heading; status
changes use a polite live region; meaning is never color-only; touch targets
are at least 44×44 CSS pixels; layouts reflow without two-dimensional scrolling
at 320 CSS pixels and 200% zoom; reduced motion disables nonessential motion.

## Security, Privacy, and Operational Bounds

- Existing 100 KiB JSON and 5 MiB multipart ceilings remain. The tighter field,
  array, 12/16 KiB context, five-question, 1–3 evidence, and 50-item list bounds
  above also apply.
- Each new AI action uses the existing authenticated AI limiter/daily quota.
  One HTTP action causes at most one provider operation, except the already
  documented bounded unavailable retry inside the same total budget where the
  shared provider service permits it.
- Provider work retains one total `AI_REQUEST_TIMEOUT_MS` budget, positive and
  no greater than 20,000 ms. Client AI requests allow the existing 5-second
  response margin. Claims use the existing 30-second stale lease.
- Safe logs may include request ID, owner-safe resource ID, operation category,
  decision/reason enum, status/code, duration, counts, and provider diagnostic
  category. They never contain JD, resume, project, prompt, answer, feedback,
  evidence text, payload, hidden reasoning, token/key/cookie, URI, or stack.
- Source Job Targets and Projects follow user delete actions. Session snapshots,
  answers, feedback, and evidence follow the existing account/session retention
  policy; V2 adds no background retention job. Account deletion must include all
  three new owned collections before release.
- Demo/staging remains one Node process plus MongoDB. Process-local draft cache
  and rate limits are acceptable only at this scale. Multiple instances,
  durable distributed limiting, or background reconciliation require a later
  architecture approval.

## Required Errors

| Code                              | Status | Meaning / recovery                                               |
| --------------------------------- | -----: | ---------------------------------------------------------------- |
| `JOB_TARGET_NOT_FOUND`            |    404 | Missing or foreign target; choose another                        |
| `JOB_TARGET_NOT_READY`            |    409 | Analysis absent/failed; retry analysis                           |
| `JOB_TARGET_ANALYSIS_IN_PROGRESS` |    409 | Same target already being analyzed; wait/reload                  |
| `PROJECT_NOT_FOUND`               |    404 | Missing or foreign project; choose another                       |
| `PROJECT_NOT_READY`               |    409 | Stored project cannot satisfy confirmed contract; edit/reconfirm |
| `PROJECT_CONFIRMATION_REQUIRED`   |    400 | Draft cannot be persisted without explicit confirmation          |
| `SKILL_NOT_FOUND`                 |    404 | Focus skill is not owned evidence; choose another                |

Pending evidence synchronization is a successful `200` read state, not an
error code. The profile/session response reports the bounded status while
feedback remains available.

All other validation, auth, rate, quota, provider, interview-state, duplicate,
and persistence failures reuse the existing safe error envelope/codes.

## Verification Allocation and Stop Gates

| Day | Minimum independently derived proof                                                       | Gate                            |
| --: | ----------------------------------------------------------------------------------------- | ------------------------------- |
|   2 | Target bounds, lifecycle, idempotency, ownership, malformed/provider/persistence failure  | No misleading `ready` record    |
|   3 | Extraction remains unsaved; explicit confirmation; ownership; edit/delete; draft recovery | No unconfirmed fact usable      |
|   4 | Exact provider schemas/enums and V1 adapter compatibility                                 | No strict-client/V1 break       |
|   5 | Every adaptive branch, one-step difficulty, repetition, cap, retry/concurrency            | Finite deterministic control    |
|   6 | Distinct target coverage; immutable target snapshot; Role Simulation UI recovery          | Targeting is observable         |
|   7 | Confirmed-only context; immutable project snapshot; category coverage                     | No invented/unconfirmed fact    |
|   8 | Claim-specific follow-up and safe provider failure/retry                                  | Meaningful Project Defense      |
|   9 | Evidence validation/dedupe/order; formula boundary table; pending reconciliation          | Reproducible mastery            |
|  10 | Weak-skill selection; targeted session; retest changes evidence without rewrite           | Closed preparation loop         |
|  11 | Replay chain/snapshots/legacy fallback/source deletion                                    | Historical stability            |
|  12 | First-use setup/navigation/dashboard states and responsive smoke                          | Usable information architecture |
|  13 | Cockpit/result states, keyboard/focus/live regions/reduced motion/zoom                    | UI quality gate                 |
|  14 | Focused suites plus full milestone regression, lint, build, docs checks                   | No unresolved P0/P1             |
|  15 | Only approved blocker fixes and optional separately approved deployed journey             | Truthful release/handoff        |

For each owning day, applicable tests cover success, validation, ownership,
duplicate/concurrent action, provider/dependency failure, persistence failure,
malformed data, recovery/retry, privacy, and V1 regression. An unaffected
category is recorded `N/A` with reason; test count is derived from these cases,
not padded to a quota. Stop on a P0/P1, contract contradiction, new dependency,
migration/backfill need, material cost/privacy change, or scope expansion and
request approval.

## Day 1 Gap Dispositions

| Gap   | Resolution                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------- |
| G1-01 | Exact API, data, lifecycle, index, error, and state contracts frozen here.                               |
| G1-02 | Strict analytics/voice shapes isolated; V1 outputs unchanged; V2 metadata optional.                      |
| G1-03 | Extraction is unsaved and explicit `confirmed:true` is mandatory.                                        |
| G1-04 | Six decisions, seven reasons, deterministic backend rules, and five-question cap frozen.                 |
| G1-05 | Values, weights, 180-day/20-entry window, rounding, labels, and confidence threshold frozen.             |
| G1-06 | Feedback is source of truth; immutable idempotent evidence follows; pending reconciliation is honest.    |
| G1-07 | Bounded immutable session snapshots survive source edits/deletion.                                       |
| G1-08 | One bounded provider operation per action, shared timeout/quota, exact context caps, mock-first proof.   |
| G1-09 | Auth-derived `userId`, owner-filtered queries, and indistinguishable foreign/missing responses required. |
| G1-10 | Functional/recovery/accessibility states precede visual polish.                                          |
| G1-11 | Existing V1 history remains preserved; this document is additive.                                        |
| G1-12 | Single-process demo/staging boundary and scaling triggers remain explicit.                               |
| G1-13 | Deferred features remain excluded; deviations stop for approval.                                         |
| G1-14 | V1 browser/device evidence remains a separate backlog and is not represented as completed.               |

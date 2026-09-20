# V1 Plan-Adherence Audit and Remediation Plan

## Purpose

This plan restores confidence that the implemented V1 matches its approved timeline, success criteria, data/API/security contracts, and recorded completion claims. It is intentionally divided into independently approvable remediation days so work can stop and resume without losing scope, evidence, or findings.

This document defines the stable sequence. `IMPLEMENTATION_STATUS.md` remains the only live tracker for current progress, findings, evidence, approvals, and resumable state.

## Why This Work Is Necessary

The existing implementation was generally tested against its own behavior, but not every documented requirement was independently mapped to evidence. The audit already confirmed that:

- Day 20 claimed full saved-result delivery while the result page omitted most persisted structured feedback;
- completed interview records could validate with incomplete feedback or summary data;
- malformed completed payloads were not validated deeply before rendering;
- important failure, persistence, concurrency, and retry paths lacked direct evidence;
- Day 22 returned a timeout safely but did not prove that parser execution itself was hard-cancelled or memory-bounded;
- status documentation overstated completion after those gaps existed.

Later dashboard, analytics, resume UI, and voice work depend on these contracts. Continuing without remediation could compound invalid records, misleading UI, weak recovery behavior, and expensive rework.

## Governing Standards

Every remediation day must follow:

- `AGENTS.md` for canonical project rules and approval boundaries;
- `DELIVERY_ASSURANCE.md` for traceability, severity, verification, and completion gates;
- `IMPLEMENTATION_TIMELINE.md` and `SUCCESS_CRITERIA.md` as the approved functional baseline;
- affected API, database, security, UI, architecture, and data-flow documents as contract sources;
- `IMPLEMENTATION_STATUS.md` as the sole live tracker.

No original plan or success criterion may be rewritten merely to make current code conform. A genuine scope change requires explicit user approval.

## Scope

Included:

- Days 6-22 plan-adherence audit;
- P0/P1 remediation required before Day 23;
- disposition and scheduling of every P2/P3 finding;
- affected tests, documentation, and completion-status corrections;
- core text-journey and resume-boundary regression proof;
- governance enforcement needed to prevent recurrence.

Excluded unless separately approved:

- Day 23 or later feature implementation;
- OCR, cloud document parsing, resume deletion, voice work, analytics, or dashboard expansion;
- unrelated refactors, UI redesign, new infrastructure, or additional parser dependencies;
- deployment or external communication;
- rewriting Git history or discarding the current working tree.

## Non-Negotiable Measures

For every audited requirement:

1. Record the exact source and observable expected behavior before editing.
2. Inspect implementation and tests separately from the completion claim.
3. Record conforming evidence or a finding; never treat missing evidence as proof.
4. Classify findings using P0-P3 definitions in `DELIVERY_ASSURANCE.md`.
5. Add a specification-derived failing test or explicit verification before a behavioral fix where practical.
6. Fix the narrowest responsible boundary and preserve surrounding behavior.
7. Validate applicable success, malformed input/output, authentication, ownership, state/concurrency, provider/dependency failure, persistence failure, recovery/retry, privacy, regression, and documentation paths.
8. Mark a day `Complete` only when every required row has evidence and no unresolved P0/P1 remains.
9. Record P2/P3 deferrals with owner, target day, workaround, and explicit user acceptance.
10. Review the final diff against the approved specification—not only against test results.

No additional PDF parser may be installed. OCR and cloud parsing remain prohibited. Private resume text, storage keys, prompts, secrets, provider payloads, and unnecessary answer content must not enter responses or logs.

## Resume and Stop Protocol

At the start of any remediation session:

1. Read `AGENTS.md`, `DELIVERY_ASSURANCE.md`, this plan, and `IMPLEMENTATION_STATUS.md`.
2. Inspect Git status and the current checkpoint record without modifying files.
3. Confirm the exact remediation day approved by the user.
4. Read only that day's authoritative requirements, target code, direct dependencies, and affected tests.
5. Continue from recorded evidence; do not repeat completed audit work without a concrete inconsistency.

At every stop:

1. Stop before starting another remediation day.
2. Record files changed, findings added/resolved, exact checks run, failures, remaining work, and whether processes/ports are clean.
3. Mark the current day `Complete`, `Partial`, or `Blocked` truthfully.
4. Do not commit, push, revert, install, deploy, or run a live provider call unless the current approval explicitly includes it.
5. State the exact next safe action.

## Phase 0 — Preserve and Stabilize the Interrupted Work

### Remediation Day R0 — Checkpoint and Working-Tree Recovery

Objective: make the current interrupted governance/remediation diff understandable and return it to a testable state without discarding valid Day 22 work.

Entry conditions:

- explicit approval for R0;
- current dirty working tree preserved;
- no assumption that any partial remediation edit is correct.

Tasks:

1. Separate the diff conceptually into prior Day 22 work, governance work, and interrupted remediation work.
2. Review every interrupted remediation edit for syntax, contract compatibility, migration impact, and unintended scope.
3. Complete or revise the partially introduced tests and fixtures, especially the PDF worker interface and strengthened interview invariants.
4. Confirm the structural delivery validator checks only enforceable structure and cannot create false completion confidence.
5. Run the smallest syntax/unit checks needed to establish a stable baseline; do not yet claim functional remediation complete.
6. Record all newly exposed failures as findings rather than weakening the new invariants.

Required evidence:

- file-by-file scope record;
- focused client/server test results for edited files;
- formatting and `git diff --check` results;
- no silent deletion or loss of Day 22 behavior.

Exit criteria:

- working tree is internally coherent and testable;
- every partial edit is retained, corrected, or explicitly rejected with reason;
- remaining failures are mapped to later remediation days;
- no Day 20/22 completion claim is restored.

## Phase 1 — Authentication and Security Foundation

### Remediation Day R1 — Audit Days 6-10

Objective: independently verify signup, login/logout, session restoration, protected routing, ownership foundations, CORS, headers, body limits, and safe errors.

Audit requirements:

- password is never stored or returned in plain text;
- duplicate normalized emails fail safely;
- authentication cookies are expiring, `HttpOnly`, production-secure, and use an appropriate `SameSite` policy;
- invalid, expired, missing, and deleted-user sessions fail safely;
- protected API and client routes reject unauthenticated access;
- request identity comes only from verified authentication;
- exact credentialed CORS, security headers, body limits, and safe logs/errors are enforced;
- loading, error, session-recovery retry, logout, refresh, and redirect behavior is proven;
- the Day 10 responsive/cross-browser claim has actual evidence or is corrected.

Required negative evidence:

- malformed signup/login payloads;
- duplicate account race or equivalent persistence conflict;
- tampered/expired token;
- user-controlled identity override;
- foreign/missing credentials;
- denied CORS origin and oversized body;
- session-restoration network failure and successful retry.

Exit criteria:

- every Days 6-10 requirement has evidence or a finding;
- no unresolved P0/P1 authentication, ownership, secret, cookie, or error-exposure finding;
- manual browser gaps are assigned clearly rather than claimed complete.

### Remediation Day R2 — Fix Days 6-10 Findings

Objective: remediate approved R1 findings at the narrowest responsible layer.

Measures:

- regression test before each material fix;
- no authentication redesign unless evidence proves the current approach cannot meet V1;
- no rate-limit expansion scheduled for Day 29 unless a current P0/P1 requires it;
- preserve existing sessions and client contracts where safely possible.

Exit criteria:

- all approved P0/P1 R1 findings resolved and independently tested;
- P2/P3 findings have explicit disposition;
- Days 6-10 status claims match evidence.

## Phase 2 — Interview and AI Data Lifecycle

### Remediation Day R3 — Audit Days 11-15

Objective: verify interview schema, setup UI, provider-neutral question generation, interview creation, next-question generation, persistence, ownership, bounds, and retry behavior.

Audit requirements:

- only supported interview types/levels and bounded question counts persist;
- every protected query includes authenticated ownership;
- first and subsequent questions are validated before persistence/rendering;
- Gemini SDK use remains adapter-only and backend-only;
- mock/Gemini contracts match;
- prompt/input/output/time/cache bounds are enforced;
- quota, timeout, malformed output, provider failure, persistence failure, and retry remain safe;
- duplicate/concurrent generation cannot create duplicate questions or uncontrolled provider usage;
- setup choices survive failure and no nonexistent question is shown as active.

Exit criteria:

- all Days 11-15 requirements traced;
- provider and persistence side effects have explicit concurrency/recovery evidence;
- P0/P1 findings resolved or moved to an explicitly approved fix day.

### Remediation Day R4 — Audit and Fix Days 16-19

Objective: verify draft preservation, typed-answer persistence, evaluation claims, validated feedback, provider failures, retry, and feedback UI.

Known focus:

- interrupted remediation introduced an evaluation lease/release approach that is not yet verified;
- provider success followed by feedback-persistence failure must not leave an answer permanently `pending`;
- retry must evaluate the already-saved answer without replacing it with a new client payload;
- simultaneous answer/evaluation requests must produce one durable result;
- completed evaluation must always contain full valid feedback, and incomplete states must not contain feedback;
- UI must show all feedback fields and preserve drafts/work on every retryable failure.

Required tests:

- normal typed answer and complete feedback;
- invalid/oversized text and missing/foreign question;
- simultaneous submissions/evaluations;
- quota, timeout, malformed provider output, and generic provider failure;
- answer-save failure, feedback-save failure, claim-release failure, stale-claim recovery, and retry success;
- malformed client response rejected without unsafe rendering;
- existing Day 19 feedback presentation and disclaimer regression.

Exit criteria:

- no answer can remain permanently unrecoverable because of an interrupted evaluation;
- no invalid feedback can persist or render;
- text-answer baseline remains dependable.

## Phase 3 — Completion and Saved Results

### Remediation Day R5 — Complete Day 20 Remediation

Objective: make completion and saved-result behavior satisfy the full Day 20 deliverable.

Known findings to resolve:

- F20-01: result page omitted full structured feedback;
- F20-02: persistence allowed incomplete completed records;
- F20-03: client result validation was shallow;
- F20-04: completion failure/concurrency/persistence/retry evidence was incomplete;
- F20-05: database documentation included inaccurate nested `summary.completedAt`.

Measures:

- completed sessions require a complete summary, at least one fully evaluated answer, no pending evaluation, and valid timestamps;
- full saved question, answer, feedback, and summary content must survive reload;
- result validation must reject malformed dates, scores, lists, nested questions, answers, and feedback safely;
- completion must be owned, atomic, deterministic, and conflict-safe;
- persistence failure must not report success or corrupt active state;
- result load error must support a proven successful retry.

Required tests:

- complete and reload the full text path;
- full structured feedback and summary rendering;
- incomplete schema states rejected;
- premature, pending-evaluation, foreign, duplicate, and simultaneous completion;
- completion persistence failure and retry;
- malformed completed response and result-page recovery;
- early completion after at least one evaluated answer.

Exit criteria:

- every Day 20 acceptance phrase has direct evidence;
- F20-01 through F20-05 are resolved or validly dispositioned by severity;
- Day 20 may return to `Complete` only after focused and full evidence passes.

## Phase 4 — Private Resume Upload and Extraction

### Remediation Day R6 — Audit and Stabilize Day 21

Objective: verify upload authentication, ownership, allow-listing, signature/size checks, private naming/storage, cleanup, persistence failure, and metadata-only responses.

Required tests:

- valid owned PDF;
- unauthenticated upload;
- unsupported MIME/extension, bad signature, empty and oversized input;
- multiple/unexpected file fields;
- metadata-persistence failure and filesystem cleanup;
- generated storage name/path traversal resistance;
- response/log privacy and cross-owner isolation;
- configured size cannot exceed the documented 5 MiB maximum.

Exit criteria:

- unsupported input is rejected before durable metadata/extraction side effects;
- no storage key or extracted text leaks;
- cleanup behavior is proven for every pre-persistence error path.

### Remediation Day R7 — Complete Day 22 Remediation

Objective: prove bounded, local, owned PDF extraction and minimum backend-only resume context without OCR, cloud parsing, or UI expansion.

Known findings to resolve:

- F22-01: the original `Promise.race` timeout did not prove hard cancellation;
- F22-02: the original text cap occurred after parser materialization;
- the interrupted remediation replaced parsing with a terminable worker, but its implementation and tests are incomplete and unverified.

Measures:

- one parser dependency only: `pdf-parse`;
- input file limit: at most 5 MiB;
- page limit: at most 20 pages;
- extraction deadline: 5 seconds with parser execution terminated, not merely a timed-out response;
- parser execution isolated behind a defensible memory/resource bound;
- persisted normalized text: at most 50,000 characters;
- question provider context: deterministic normalized owned excerpt at most 2,000 characters;
- failed extraction stores a safe recoverable state and preserves the documented fallback/re-upload path;
- no raw PDF, extracted text, parser detail, storage key, or full resume enters client responses/logs;
- no-resume question generation remains unchanged.

Required tests:

- real valid PDF success;
- malformed, password-protected where fixture permits, image-only/empty-text, oversized, over-page, over-text, timeout, worker crash, and memory/resource failure;
- hard worker termination on timeout;
- completed/failed/pending resume invariants;
- extraction-state persistence conflict/failure;
- owner and cross-owner extraction/context access;
- first and subsequent provider calls receive only bounded context;
- no-resume path receives no context;
- response and log privacy.

Exit criteria:

- limits are enforced during processing, not only after persistence;
- all Day 22 success/failure/ownership/no-resume/provider-context paths pass;
- F22-01 and F22-02 are resolved or Day 22 remains `Partial`.

## Phase 5 — Cross-Cutting Proof and Documentation

### Remediation Day R8 — Milestone Regression and Handoff

Objective: close the assurance checkpoint and prepare a truthful Day 23 handoff.

Tasks:

1. Review the final diff against every traceability row and finding.
2. Run focused changed-area tests, then exactly one full verification sequence:
   - `npm run validate:delivery`;
   - `npm test`;
   - `npm run lint`;
   - `npm run build`;
   - `npm run format`;
   - `git diff --check`.
3. Perform the approved core text-flow smoke: authenticate, start each supported type as appropriate, answer, receive full feedback, progress/finish, reload saved results, and verify ownership denial.
4. Perform the approved resume boundary smoke with synthetic data only: valid extraction/context and no-resume fallback.
5. Confirm no temporary server remains and ports used for verification are free.
6. Reconcile API, database, security, technical-decision, success/status, and manual-task documentation with actual behavior.
7. Correct historical `Complete`/`Partial` claims based on evidence.
8. Present commit scope before any commit; commit/push only when explicitly approved.

Exit criteria:

- every required audit row has implementation and verification evidence;
- no unresolved P0/P1 remains;
- every P2/P3 has explicit disposition, owner, and target;
- full checks and approved smokes pass;
- core text journey and optional resume boundary are stable;
- assurance checkpoint is `Complete` and Day 23 remains unstarted until separately approved.

## Global Stop Conditions

Stop and request direction when any of the following occurs:

- specification conflict or material ambiguity;
- required schema/data migration affecting existing records;
- new dependency or infrastructure requirement;
- destructive cleanup, data loss, or Git history change;
- security/privacy risk beyond the approved remediation boundary;
- inability to enforce a stated hard resource limit with the approved architecture;
- provider/live request cost not already approved;
- a proposed fix materially changes V1 scope or working behavior.

Ordinary failing tests, implementation difficulty, or additional in-scope findings are not reasons to conceal or abandon the audit; record them and continue within the approved day.

## Final Acceptance Criteria

The remediation program is complete only when:

- Days 6-22 have requirement-to-evidence coverage;
- confirmed deviations are fixed or explicitly rescoped according to severity;
- authentication and every protected resource preserve ownership isolation;
- the full text interview path persists and reloads complete questions, answers, feedback, and summary;
- AI and parser inputs/outputs, time, size, state, concurrency, and retry behavior are bounded and validated;
- private resume data remains backend-only and the no-resume path works;
- failure states preserve work, report safe errors, and have proven recovery behavior;
- full checks pass once on the final diff;
- documentation and `IMPLEMENTATION_STATUS.md` describe only what evidence proves;
- manual tasks and accepted limitations are explicit;
- Day 23 begins only after separate approval.

## Manual Evidence Reserved for the User

Where automated proof is insufficient, the final checkpoint may require the user to verify:

1. Authentication and result flows in the target browsers/devices named for V1.
2. Production/deployment cookie, CORS, HTTPS, and SPA rewrite behavior once a target environment exists.
3. Consent and privacy handling before using any real resume with the configured Gemini free tier; synthetic resumes remain the development default.

These tasks must not be marked complete before they are actually performed. Deployment-specific items may remain assigned to their original later timeline days when they are not prerequisites for local Day 23 work.

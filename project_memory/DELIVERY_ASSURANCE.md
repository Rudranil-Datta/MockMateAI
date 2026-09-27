# Delivery Assurance Standard

## Purpose and Authority

This document prevents implementation from being declared complete merely because its own tests pass. It governs planned work, audits, remediation, and release decisions.

Authority order:

1. Explicitly approved user direction.
2. `IMPLEMENTATION_TIMELINE.md` and `SUCCESS_CRITERIA.md` for scope and observable outcomes.
3. Affected API, database, security, UI, architecture, and data-flow documents for contracts and constraints.
4. `IMPLEMENTATION_STATUS.md` for the live execution record.

When sources conflict, stop and obtain approval. Do not silently reinterpret, narrow, or update the specification to fit existing behavior.

## Required Delivery Lifecycle

### 1. Specify before editing

In `IMPLEMENTATION_STATUS.md`, create one traceability row for every independently observable requirement. Each row must contain:

- stable requirement ID and authoritative source;
- exact expected behavior;
- affected UI, API, persistence, validation, error/recovery, security/privacy, test, and documentation boundaries;
- primary risk and planned mitigation;
- implementation and verification evidence, initially `Pending`;
- disposition: `Required`, `Approved deferral`, or `N/A` with a reason.

Ambiguous plan language must be resolved against success criteria and affected contracts before implementation. If material ambiguity remains, request user direction.

### 2. Plan independent verification

Acceptance tests come from the specification, not from the code being written. Use the matrix to classify risk. Record a direct test only for categories the approved change can affect; record `N/A` with a reason for the rest. The matrix is not a mandate to exercise every category for every task.

| Category                    | Required evidence                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Success                     | Observable approved outcome, including persisted reload where applicable.                   |
| Validation                  | Boundary values and malformed input/output are rejected safely.                             |
| Authentication/ownership    | Unauthenticated and cross-owner access cannot read or mutate data.                          |
| State and concurrency       | Invalid transitions, duplicates, and competing requests remain consistent.                  |
| Dependency/provider failure | Timeout, quota, parser/provider, or downstream failures are bounded and safely mapped.      |
| Persistence failure         | Partial writes and cleanup behavior preserve integrity and recoverability.                  |
| Recovery/retry              | User work is preserved and retry or fallback behavior is proven.                            |
| Privacy/security            | Secrets, private content, storage identifiers, and unsafe errors are not exposed or logged. |
| Regression                  | Existing core text journey and documented optional paths still work.                        |
| Documentation               | API, database, security, decision, and status records match actual behavior.                |

Tests must assert meaningful outputs and state invariants. A test that merely repeats the implementation's assumptions is not independent evidence.

### 3. Implement narrowly

- Change only approved requirements and their direct dependencies.
- Validate before side effects and again before persistence/rendering where data crosses a trust boundary.
- Enforce critical lifecycle invariants at the service and persistence boundaries.
- Use hard, measurable bounds for files, text, requests, time, retries, provider context, and stored documents where applicable.
- Preserve working behavior and user data; avoid unrelated refactors and dependencies.

### 4. Verify in layers

1. Run the narrowest deterministic tests that exercise the changed feature and its directly affected contracts after the implementation is stable enough to evaluate.
2. Run lint only for an affected source workspace. Run a production build only when client/build behavior changed or a release gate requires it.
3. Inspect the final diff against every traceability row for scope creep, missing handling, and documentation mismatch.
4. Run `npm run validate:delivery` when `IMPLEMENTATION_STATUS.md`, this assurance policy, or related delivery-governance structure changes.
5. Run the complete workspace suite only for a named milestone or release gate, a cross-cutting/shared-infrastructure/security/schema/provider change, or an explicit user request. Do not use it as the routine daily default.
6. Browser automation and runtime smoke are not routine checks. Use at most one focused smoke only when browser-only, deployment, CORS, cookie, permission, upload, or similar behavior cannot reasonably be established through code-level verification, or when the user explicitly asks for it. Do not repeat a successful smoke unless the relevant executable code, configuration, or environment changed.
7. A documentation-only change requires only targeted formatting, applicable documentation validation, and diff inspection. It does not trigger code tests, lint, builds, servers, or browser automation, including when documentation is updated after successful code verification.
8. Rerun only a failed check or a check affected by a subsequent executable change. Record exact commands and results as evidence.

Green tests do not override a missing requirement, weak invariant, documentation conflict, or untested risk.

### 5. Perform the completion review

Before setting a day to `Complete`, answer from evidence:

- Does every approved requirement have implementation and verification evidence?
- Does the final behavior satisfy the source wording without narrowing it?
- Are UI, API, persistence, validation, failure/recovery, privacy, and documentation impacts addressed or justified `N/A`?
- Did the final diff introduce unapproved scope, a dependency, migration, privacy/security change, or regression?
- Are all findings classified and resolved or validly deferred?

Record the review outcome and deviations in `IMPLEMENTATION_STATUS.md`.

## Finding Severity and Disposition

| Severity | Meaning                                                                                                                           | Completion effect                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P0       | Security/privacy breach, ownership bypass, data loss, secret exposure, or unusable core journey.                                  | Blocks completion and release. Explicit approval is required for the fix; deferral is not acceptable for V1 release. |
| P1       | Approved success criterion or core contract is missing/broken; invalid persisted state; material recovery or reliability failure. | Blocks completion. Fix or explicitly rescope with user approval.                                                     |
| P2       | Non-core edge case, weak defensive validation, missing secondary test, or maintainability issue with a safe workaround.           | Record with owner and target day; may be deferred with explicit user acceptance.                                     |
| P3       | Cosmetic, wording, or low-impact cleanup that does not misrepresent behavior.                                                     | Record or fix opportunistically; does not block completion.                                                          |

Never lower severity to make a day complete. When uncertain between two levels, use the higher level until evidence supports the lower one.

## Status Definitions

- `Complete`: all approved requirements have evidence; required checks pass; documentation matches; no unresolved P0/P1 remains; every P2/P3 deferral is recorded.
- `Partial`: useful work exists, but any requirement/evidence/check is incomplete, or a P0/P1 remains unresolved.
- `Blocked`: progress cannot continue safely without user input, external access/state, or an approved scope/contract decision.
- `Not started`: no state-changing implementation work has begun.

The completed-work log must describe what evidence proves, not make broader claims. A day previously marked complete must be corrected to `Partial` when later evidence disproves completion.

## Audit and Remediation Protocol

Audit milestones before new dependent work: authentication/security, core interview data lifecycle, optional resume/voice boundaries, analytics/dashboard, and final release.

The current Days 6-22 checkpoint is sequenced in `V1_REMEDIATION_PLAN.md`. That plan defines resumable phases; `IMPLEMENTATION_STATUS.md` remains the only live progress and evidence record.

For each audited requirement:

1. Read the approved source and affected contracts.
2. Locate implementation and tests without editing.
3. Record conforming evidence or a finding; absence of evidence is not evidence of absence.
4. Classify the finding P0-P3 and identify the failed or missing mitigation.
5. Obtain approval before remediation unless the user already approved that bounded remediation scope.
6. Establish a failing regression test or explicit verification that represents the specification.
7. Apply the narrowest responsible fix and verify adjacent behavior.
8. Update contracts and status truthfully; do not rewrite the baseline plan to conceal deviation.

Audit order for the current V1 checkpoint:

1. Days 6-10: authentication, authorization, ownership, session and HTTP security.
2. Days 11-20: interview schema, question/answer/evaluation lifecycle, completion and results.
3. Days 21-22: upload privacy, bounded extraction, resume ownership and provider context.

Fix approved P0/P1 findings before Day 23. Record P2/P3 items for user disposition. After remediation, rerun the focused checks affected by the finding. Rerun the primary text journey or full workspace checks only when the finding is cross-cutting, affects that journey, belongs to a named milestone/release gate, or the user explicitly requests it.

## Required Status Structure

The current execution plan in `IMPLEMENTATION_STATUS.md` must contain:

- objective and explicit approval scope;
- requirement traceability matrix;
- verification matrix;
- blockers/decisions;
- deviation and finding register;
- completion review.

`IMPLEMENTATION_STATUS.md` remains the only live tracker. This standard is a stable process definition, not a second task board. `IMPLEMENTATION_TIMELINE.md` remains the approved baseline and changes only through explicit scope approval.

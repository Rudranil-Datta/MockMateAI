# V2 Day 11 — Replay Timeline and Honest Retest Comparison

## Approval boundary

Implement only replay/result UI and its minimum additive, read-only data support. Preserve V1 result readability and existing response fields. No Day 12 navigation/dashboard/workspace work; no Day 13 cockpit redesign; no dependency install, provider call, migration, deployment, or browser smoke.

## Traceability matrix

| ID      | Required outcome                                                                                                                       | Boundaries                                                  | Risk control                                                                                             | Independent proof                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| D11-R01 | Render an owned completed V2 session as ordered replay, while legacy V1 sessions remain readable with an honest metadata-absent state. | Owned session read, client API validation, result page      | V2 fields remain optional; no fabricated labels                                                          | V2/legacy client cases; foreign/missing session route test                                            |
| D11-R02 | Show parent/follow-up relationship, question order, topic, difficulty, tested skills, and safe decision label.                         | Existing saved question metadata, replay components         | Render only complete validated metadata; never expose hidden reasoning/provider payload                  | Parent-link, malformed/partial metadata, ordering, and label tests                                    |
| D11-R03 | Show immutable Role/Project context snapshot label after source edit or deletion.                                                      | Existing session snapshot/read path, replay UI              | Read saved snapshot only; never reread mutable/deleted source                                            | Atlas source-deletion replay integration test                                                         |
| D11-R04 | Show targeted-practice retest comparison using deterministic prior/current mastery and confidence.                                     | Additive owned read-only `retestComparison`; result UI      | No raw evidence, prompt, answer, provider content, or hiring claim; provisional wording remains explicit | Atlas prior/current calculation, pending-sync/absent comparison, safe serialization, client rendering |
| D11-R05 | Preserve honest recovery states.                                                                                                       | Existing feedback/evidence sync and result loading/retry UI | Pending evidence says comparison unavailable; no invented score delta                                    | Pending recovery, load failure/retry, unavailable comparison tests                                    |
| D11-R06 | Meet replay accessibility and responsive baseline.                                                                                     | Result/replay components and CSS                            | Semantic timeline, keyboard order, visible focus, labels not color-only, 320px reflow                    | Focused component tests and stylesheet review                                                         |
| D11-R07 | Keep contracts and tracker truthful.                                                                                                   | API/design/data-flow/status documents                       | Document only actual additive read shape and V1 fallback                                                 | Documentation validation, formatting, diff review                                                     |

## Additive interface

`GET /api/interviews/:id` may return optional `retestComparison` only for an owned targeted session with synchronized comparison data:

```json
{
  "skillKey": "node-js",
  "skillLabel": "Node.js",
  "previousMasteryScore": 65,
  "currentMasteryScore": 72,
  "previousConfidence": "provisional",
  "currentConfidence": "emerging"
}
```

If comparison data is pending or unavailable, omit this field. The UI states that comparison is unavailable or still synchronizing; it never estimates a delta.

## Verification matrix

| Category       | Planned evidence                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Success        | Owned V2 timeline, skills, parent links, snapshot label, and retest comparison render correctly.              |
| Validation     | Partial/malformed V2 metadata and malformed comparison are rejected before rendering.                         |
| Ownership      | Foreign and missing sessions remain indistinguishable; comparison derives only owned evidence.                |
| State/recovery | Pending evidence remains honest; result load retry preserves usable state.                                    |
| Persistence    | Atlas test proves source deletion cannot alter replay; no new write path except existing evidence flow.       |
| Privacy        | No raw evidence, answer/prompt duplication, provider payload, source identifier, or hiring inference appears. |
| Regression     | V1 DSA/HR/System Design result rendering stays unchanged; Role/Project existing result data remains valid.    |
| Accessibility  | Timeline semantics, focus order, live status, contrast, mobile reflow.                                        |
| Documentation  | API, data flow, status, and implementation boundaries match final behavior.                                   |

## Test scope and stop gates

- Focused client API/result tests; focused server unit/service and direct Atlas integration tests using isolated worker databases only.
- Run client lint/build because executable client UI changes; server lint only if server read serialization changes; delivery validation and diff check.
- Do not run full workspace, live Gemini, deployment, or browser automation.
- Stop for any dependency need, new persistence migration, missing safe comparison source, V1 result regression, ownership/privacy issue, or unresolved P0/P1.

## Remediation completion record — 2026-10-06

**Status:** Complete. Reused earlier safe serializers/comparison calculation;
added only missing replay UI, validation, source-deletion proof, and docs.

| ID      | Required remediation                                               | Final evidence                                                                                           | Status |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------ |
| D11-R01 | Dedicated ordered replay timeline and legacy fallback.             | Semantic ordered result timeline; existing V1 fixture passes.                                            | Passed |
| D11-R02 | Visible parent/follow-up chain and validated complete metadata.    | Follow-up text plus complete metadata and earlier-parent validation; malformed tests reject unsafe data. | Passed |
| D11-R03 | Direct Atlas deletion proof for rendered immutable snapshot.       | Role and Project source deletion then owned Atlas result read returns only saved `kind`/`label`.         | Passed |
| D11-R04 | Honest pending/absent retest state and safe comparison validation. | Calculation/UI pass locally; direct Atlas prior/current proof passes.                                    | Passed |
| D11-R05 | Semantic accessibility and responsive replay verification.         | Ordered list, text labels, existing visible focus, narrow-layout and reduced-motion stylesheet review.   | Passed |
| D11-R06 | API, data-flow, and status documentation reconciliation.           | API/data-flow/status updated; delivery validation and scoped diff check pass.                            | Passed |
| D11-R07 | Final review against this matrix.                                  | Requirement-to-diff/test/document review completed below.                                                | Passed |

## Risk and gap-remediation matrix

| ID     | Severity | Gap / risk                                                                                 | Required control and proof                                                             | Status   |
| ------ | -------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------- |
| G11-01 | P1       | Private evidence/provider data or source IDs appear in replay.                             | Safe server serializer, exact client snapshot validation, and malformed response test. | Resolved |
| G11-02 | P1       | Retest delta is invented while evidence is absent or synchronization is incomplete.        | Omit comparison; visible synchronizing/unavailable state; Atlas and UI tests pass.     | Resolved |
| G11-03 | P1       | Source edit/deletion changes replayed Role/Project context.                                | Saved snapshot only; direct Atlas deletion-and-read tests pass.                        | Resolved |
| G11-04 | P1       | Optional V2 fields regress legacy result rendering.                                        | Legacy fixture plus V2 malformed-field rejection tests.                                | Resolved |
| G11-05 | P2       | Timeline lacks semantic order, parent clarity, keyboard/focus, or narrow layout usability. | Ordered list, text labels, existing focus/reduced-motion/narrow CSS review.            | Resolved |
| G11-06 | P1       | Tracker says Complete despite unimplemented approved requirements.                         | Live status reconciled only after all rows and evidence passed.                        | Resolved |

## Final verification

- Client result tests: 17 passed.
- Local focused server unit/integration tests: 20 passed.
- Direct Atlas focused integration tests: 16 passed, using disposable
  `mockmateai_day11_atlas_<worker>` databases and cleanup.
- Client/server lint, client production build, delivery validation, and scoped
  Day 11 diff check passed.
- No browser automation, dependency installation, provider request, migration,
  deployment, commit, or push ran.

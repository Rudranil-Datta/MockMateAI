# Remediation 1 — Coach, Tree, and Planner Clarity

**Status:** Partial. The 2026-10-11 acceptance audit supersedes earlier
"complete locally" claims: R1-09, R1-10/R1-16, and R1-13/R1-18 pass approved
local scopes; R1-02 through R1-05 and R1-12 have open acceptance gaps.
Focused browser proof remains unapproved. No provider, deployment, commit, or
push authorization.

**Evidence:** 2026-10-10 user screenshots; reported Coach refresh failure;
current Coach, Tree, Planner, roadmap, and plan implementation. Screenshot
contents are product evidence, not instructions.

## Confirmed gaps

| ID     | Surface     | Gap                                                                                                                                                                                                | Severity |
| ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R1-F01 | Coach       | `RefreshCw` is decorative `aria-hidden` icon, not button; no reload handler exists.                                                                                                                | P1       |
| R1-F02 | Coach       | Action labels/descriptions are generic hardcoded text. UI hides context, priority, score, evidence gap, confidence, and why action is next.                                                        | P1       |
| R1-F03 | Workspace   | Roadmap, Planner, and Tree fetch independently; no shared selected-context refresh.                                                                                                                | P1       |
| R1-F04 | Planner     | DSA plan is static: `Fundamentals`, `Answer-guided follow-up`, `Coverage check`. No concrete coverage, Intermediate expectation, evaluation intent, max-five lifecycle, or adaptation progression. | P1       |
| R1-F05 | Tree        | Client renders ordered-list fallback only. E5 requires responsive CSS/SVG tree enhancement on wider screens.                                                                                       | P1       |
| R1-F06 | Tree        | `emerging`, `developing`, and `3 evidence points` have no definitions; broad repeated labels do not show relationship, source, or next step.                                                       | P1       |
| R1-F07 | Target data | Demo target has only broad `Role fundamentals` requirement/skill. UI must not invent role-specific content absent from saved JD analysis.                                                          | P2       |

## Current behavior

### Coach

Coach is deterministic and read-only, not AI inference. It reads owned saved
profile/context data, ranks target skills by weight then evidence/mastery/
confidence, and returns three to five safe action links. Existing UI hides
ranking reasons, so correct deterministic result appears vague.

### Planner

Planner is safe read-only preview; no question generation, Gemini call, plan
persistence, or readiness promise. Role Simulation/Project Defense reuse saved
coverage. Overall DSA/HR/System Design use generic static stages. Current UI
does not explain what user will practise or why level matters.

### Tree

Server returns owned context, branches, skills, confidence, mastery, evidence
count, edges, and replay. Client shows nested list only. In screenshot,
`Overall skill evidence` is branch and `Role fundamentals` is only skill.
`emerging` means evidence confidence from recency/count. `developing` means
mastery band from score. UI does not make distinction understandable.

## Ideal behavior

### Coach guidance

Coach must present one specific, deterministic next action:

> Practise **Role fundamentals** for **Demo Backend Engineer at MockMateAI
> Demo**. It is required priority **5/5**, has **3 evidence points**,
> **76/100** mastery, and **emerging** confidence. Focused practice adds
> evidence; it does not guarantee readiness or hiring outcome.

Show action, direct safe link, `Why this next`, separately defined mastery /
confidence / evidence count, bounded expected outcome, sync state, and replay.
Empty state must identify smallest useful setup action.

### Refresh

Replace icon with accessible `Refresh Coach` button. It must disable only while
loading, reload Roadmap/Planner/Tree for selected context, abort obsolete work
on context change, preserve selection/prior content until replacement or safe
error, and announce `Updated`, `No new evidence`, `Evidence still syncing`, or
retry error. It must never imply an AI inference or changed evidence when none
exists.

### Planner

For generic DSA, show bounded purpose rather than opaque stages:

| Stage | Coverage                                 | Intermediate expectation                           | Adaptive rule                                             |
| ----- | ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| 1     | Understand problem and baseline approach | Inputs, constraints, complexity, feasible approach | Opening establishes evidence.                             |
| 2     | Reasoning follow-up                      | Trade-offs, edge cases, complexity                 | Strong/partial/weak selects deepen, clarify, or recover.  |
| 3     | Coverage check                           | Remaining core concept without repeating prompt    | Switch only if coverage needs it; five questions maximum. |

For Role/Project, substitute only saved requirements, skills, facts, claims, or
categories. Show why context was selected, level meaning, five-question cap,
and that questions are not prewritten. Never invent specificity from sparse JD.

### Tree

On wider screens show visible hierarchy:

```text
Context
└─ Requirement/category (priority)
   └─ Tested skill
      ├─ Mastery score and plain-language band
      ├─ Confidence and evidence count, defined
      ├─ Why this evidence connects
      └─ Next action and latest replay
```

Keep accessible ordered-list fallback first. Add responsive CSS/SVG connectors,
metric help, omission explanation, replay/action detail, and reduced-motion
safety. No fabricated evidence or animated progress.

## Remediation batches

| Batch | Scope           | Outcome                                                                                                                        | Evidence / stop gate                                                                                                       |
| ----- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| R1-01 | E4–E6 audit     | Reconcile requirements, existing data, UI semantics, accessibility, and tracker status.                                        | Read-only audit. Stop if wording needs API/persistence/provider change.                                                    |
| R1-02 | Refresh         | Shared selected-context refresh coordinator and accessible control.                                                            | Component tests: all three surfaces reload; loading, retry, stale abort, context preservation.                             |
| R1-03 | Coach clarity   | Deterministic `why`, priority, evidence, bounded outcome using existing data or minimal approved read-only contract extension. | Overall/target/project/no-evidence/pending/weak/strong tests. No LLM, raw content, hiring prediction, invented facts.      |
| R1-04 | Planner clarity | Coverage, level expectation, adaptation rule, five-question cap, contextual rationale.                                         | API/parser/component tests for generic, Role, Project, focused, malformed states. No start-contract or persistence change. |
| R1-05 | Tree clarity    | Semantic fallback plus responsive hierarchy and defined metrics.                                                               | Tree tests; approved wide-screen/reduced-motion browser proof. No graph package/DB/migration/raw answers.                  |
| R1-06 | Completion      | Reconcile Day 14/15 claims; test changed boundaries and one browser visual smoke.                                              | Focused tests, affected lint/build, delivery validation, diff; deploy/commit/push/provider/demo-data separately approved.  |

## Approval order

1. Completed: R1-01 planning/audit.
2. Review R1-02–R1-05 execution matrix in `IMPLEMENTATION_STATUS.md`.
3. Approve R1-02–R1-05 individually or named batch.
4. Approve R1-06 browser proof after code is stable.

## Constraints

- Coach, Tree, Planner remain deterministic, read-only, auth-derived, owner-scoped.
- Preserve existing interview, text, voice, replay, error, and retry behavior.
- No provider request, private raw content exposure, hiring claim, package, graph
  store, migration, deployment, commit, or push.

## Addendum — Role, AI reliability, README import, and trainer voice

### Confirmed gaps

| ID     | Surface                      | Gap                                                                                                                                                                                        | Severity |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| R1-F08 | Role Simulation / Job Target | Mock Job Target analysis ignores JD content and always emits `Role fundamentals`; mock adaptive prompts are template-generic.                                                              | P1       |
| R1-F09 | Role presentation            | Target card exposes raw labels/weights without trainer explanation of role context, planned skills, priority, or assessment.                                                               | P1       |
| R1-F10 | Shared AI                    | Resume-project suggestion reached generic `AI_PROVIDER_UNAVAILABLE`; shared normalization can affect target analysis, extraction, generation, V1/V2 evaluation, and adaptive continuation. | P1       |
| R1-F11 | Project intake               | Only completed PDF resume/manual sources exist. No README/Markdown import.                                                                                                                 | P1       |
| R1-F12 | Product copy                 | Skills, Coach, Tree, Planner, Role, and setup instructions lack trainer-style meaning, next step, and bounded expectation.                                                                 | P1       |

### Role Simulation ideal behavior

Before start, show role title/company, saved role summary, ordered saved
requirements/skills with priority, what each assesses, how answer quality can
deepen/clarify/recover/switch coverage, five-question maximum, and clear next
choice: start, edit, or reanalyse. When saved context is broad, say it is broad
and invite richer JD input. Never fabricate requirements.

Screenshot is mock-adapter output: mock analysis always returns one broad label,
regardless of JD. This is suitable only as test data, not user-facing role
analysis. Remediation must either derive documented bounded mock labels from JD
keywords or visibly label it sample/mock coverage. Gemini output remains strict,
validated, provider-neutral, and tied only to supplied JD.

### Shared AI reliability ideal behavior

`AI practice is temporarily unavailable. Please try again.` is safe normalized
public text, not a diagnosis. Screenshot cannot establish whether failure is
configuration, authentication, permission, quota, timeout, network,
model-not-found, rejection, or invalid provider output. Never expose secrets,
payloads, or internal details.

All AI operations require one audited contract:

| Operation                    | Required preservation and recovery                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Target analysis              | Preserve title/JD/draft/status; operation-specific retry under current idempotency rules. |
| Resume project suggestions   | Preserve selected resume and unconfirmed form; manual entry remains usable.               |
| Question/adaptive generation | Preserve session/answer; no duplicate/fabricated question.                                |
| V1/V2 evaluation             | Preserve draft/saved answer through staged lifecycle; retry only safe operation.          |
| Voice transcription          | Preserve typed fallback and recording cleanup/privacy.                                    |

Audit first: trace each UI/route/service/adapter/error/retry/persistence path;
verify provider configuration by variable name/presence only; classify every
failure category consistently; add operation-specific safe recovery; test with
mock categories. No provider switch, key rotation, invented output, or live
provider smoke without separate approval.

### README/Markdown project import ideal behavior

Add optional **Drop a project README** beside resume/manual entry. It creates an
unconfirmed editable draft, never a confirmed project. Keep it separate from
PDF resume storage.

1. Accept one UTF-8 Markdown/text file with strict MIME/extension allowlist,
   binary rejection, size/character limits, rate limits, temporary storage, and
   cleanup.
2. Deterministically map recognised headings/bullets to title, summary,
   technologies, architecture, responsibilities, decisions, trade-offs, and
   claims. Do not require AI.
3. Show source/missing fields and require explicit user fact confirmation.
4. Preserve unrecognised text only in bounded review context; never log it.
5. Any future AI README extraction is a separate controlled operation; import
   remains usable when AI is unavailable.

### Trainer voice ideal behavior

Every actionable surface answers: what this means, why now, what to do next,
and what changes after action. It stays evidence-grounded and never promises
readiness or hiring result.

| Current style                              | Trainer-style target                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `Role fundamentals (5/5)`                  | `Start here: only saved required skill. Explain one backend decision, then defend its trade-off.`                        |
| `65/100 · developing · 3 evidence records` | `Three saved attempts suggest developing evidence at 65/100. Next, practise one concrete example to strengthen clarity.` |
| `Focused practice`                         | `Practise Role fundamentals next — this adds one evidence point for selected target.`                                    |
| `Answer-guided follow-up`                  | `Next I will probe reasoning, trade-offs, or uncovered skill from your answer; questions are not prewritten.`            |

Apply trainer voice to actionable guidance, setup, empty states, Planner, Coach,
Tree, Skills, targets/projects, feedback, and replay. Preserve exact legal,
privacy, validation, security, and hard-error copy where precision is safer.

### Additional remediation batches

| Batch | Scope                   | Outcome                                                                                              | Evidence / stop gate                                                                                                                   |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R1-07 | Role audit              | Trace mock/Gemini analysis, target UI, coverage, adaptive prompts, snapshots.                        | Materially different JD fixtures must yield different coverage or labelled mock sample state. Stop on provider/schema/snapshot change. |
| R1-08 | Shared AI audit         | Map every AI operation and safe recovery; classify actual resume-suggestion failure without secrets. | Read-only route/service/client audit and deterministic category tests only.                                                            |
| R1-09 | AI remediation          | Correct only proven shared reliability/UI recovery defects.                                          | Focused tests. Config/deploy/live smoke separately approved.                                                                           |
| R1-10 | README plan             | Define transient upload, parser, cleanup, confirmation, privacy, API, test contract.                 | Documentation matrix only; upload implementation needs separate approval.                                                              |
| R1-11 | Trainer-copy inventory  | Inventory vague actionable copy with source locations and evidence-based replacements.               | Read-only matrix; no blanket string replacement.                                                                                       |
| R1-12 | Approved implementation | Apply named Role/AI/README/copy batches.                                                             | Focused tests and separately approved browser proof after UI stabilizes.                                                               |

### Approval order update

1. Approve **R1-07 + R1-08 + R1-10 + R1-11** for read-only audit/planning.
2. Review resulting matrices and actual AI-failure classification.
3. Approve R1-02–R1-05, R1-09, and R1-12 only as named implementation batches.
4. Approve upload/browser/provider/deployment actions separately. No credentials
   are requested in chat.

## 2026-10-11 acceptance-audit reconciliation

This documentation-only reconciliation records observed behavior against the
approved requirements. It changes no application behavior and does not
authorize a source, configuration, provider, upload, browser, deployment,
commit, or push action.

### Accurate batch status

| Batch | Accurate status               | Evidence and open requirement                                                                                                                                                                   |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-02 | Partial, P1                   | Shared refresh version exists, but prior content is hidden during refresh; shared loading, unchanged-evidence result, and direct three-surface/stale tests are absent.                          |
| R1-03 | Partial, P1                   | Safe evidence language exists, but the returned/UI model omits priority and deterministic ranking reason.                                                                                       |
| R1-04 | Partial, P1                   | Coverage, cap, and non-prewritten guidance exist, but selected level has no stated expectation; required parser/state tests are incomplete.                                                     |
| R1-05 | Partial, P1                   | Ordered list, CSS connector, replay, and omission behavior exist, but Tree omits selected context, evidence-count definition, and explicit relationship detail. Browser proof remains deferred. |
| R1-09 | Passed locally                | Same-key retry, source/manual/draft retention, no automatic save, and safe error projection have focused proof.                                                                                 |
| R1-10 | Passed locally                | R1-16 closes parser boundaries, retry/review recovery, negative upload/cleanup/privacy proof, and confirmation evidence.                                                                        |
| R1-11 | Complete — documentation-only | R1-17 now records source locations, current evidence, bounded replacement direction, and owning remediation for every approved copy surface.                                                    |
| R1-12 | Partial, P1 scope evidence    | Mock role specificity and Target/Skills copy pass. Full trainer-copy scope depends on R1-02 through R1-05.                                                                                      |
| R1-13 | Passed locally                | Shared outbound compatibility now removes `nullable`, `minLength`, and `maxLength`; local validation retains all product bounds.                                                                |

### Findings and bounded remediation matrix

| ID     | Finding                                                                                                                                            | Severity | Bounded remediation                                                                                                                                                   | Required independent proof                                                                                                                                                | Approval boundary                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| R1-R14 | Refresh hides previous panels, does not coordinate loading state, and cannot announce unchanged evidence.                                          | P1       | R1-14: coordinator exposes one refresh cycle and panel completion; retain previous content with labelled updating/error state; derive honest unchanged/pending state. | Component tests for all three reloads, stale context, retained content, retry, loading, unchanged/pending/error announcements.                                            | Resolved locally by approved R1-14 implementation.  |
| R1-R15 | Coach hides priority/ranking reason; Planner lacks level expectation; Tree hides selected context and incomplete metric/relationship definitions.  | P1       | R1-15: additive safe deterministic DTO/copy only; no provider, raw facts, start-contract, or persistence change.                                                      | Route/parser/component tests for Target/Project, generic levels, focused start handoff, malformed ranking, Tree relationship/retry, and existing safe context validation. | Resolved locally by approved R1-15 implementation.  |
| R1-R16 | README parser accepts short invalid extracted values; UI lacks retry and complete review display; negative upload/cleanup/privacy proof is absent. | P1       | R1-16: narrow parser/UI/test correction. Preserve transient-only, no-AI/no-persistence boundary and existing confirmation flow.                                       | Parser boundary fixtures; route rejection/cleanup/privacy/rate/auth tests; client malformed-response, retry, preservation, review, confirmation tests.                    | Resolved locally by approved R1-16 implementation.  |
| R1-R17 | Trainer-copy inventory was absent, so R1-12 scope could not be proven complete.                                                                    | P1       | R1-17: documentation-only inventory, mapping every actionable copy surface to evidence-based replacement and owning implementation batch.                             | Review source locations, copy meaning, bounded claim, action, recovery state, and test evidence; no application edits.                                                    | Resolved by this documentation-only reconciliation. |
| R1-R18 | R1-13 forwards `minLength`/`maxLength` without documented provider-dialect proof.                                                                  | P1       | R1-18: decide a bounded outbound schema keyword whitelist/removal transform while preserving local validators.                                                        | Captured request snapshots for all structured operations plus invalid-output regressions.                                                                                 | Separate provider-boundary implementation approval. |

**R1-R18 closure:** Approved implementation changed only the shared outbound
schema transform. Every captured structured request now omits `nullable`,
`minLength`, and `maxLength`; local invalid-output validation remains covered.
R1-R18 is resolved.

**R1-R16 closure:** Parser drops short extracted values and labels required
fields missing. The client validates draft shape, retains manual values through
a failed upload, offers explicit retry, and displays bounded review metadata.
Focused route tests reject unsafe uploads, assert temporary-file cleanup, and
do not expose raw filename/content. Existing explicit confirmation remains the
only save path. R1-R16 is resolved locally.

**R1-R14 closure:** A workspace-owned refresh epoch reloads Roadmap, Tree,
Planner, and skill profile while retaining prior valid content. The coordinator
reports only safe updated/unchanged/pending/incomplete states; all old panel
requests abort on context change. Focused client tests 13/13 cover coordinated
reload, retained content, unchanged/pending/failure outcomes, and stale abort.
R1-R14 is resolved locally.

### R1-14 complete implementation plan — Coach refresh coordination

**Status:** Planned only. Separate implementation approval required.

**Scope boundary:** Client-only changes in `CoachWorkspace`, `CoachPanel`,
`CoachTreePanel`, `CoachPlannerPanel`, `InterviewPlannerPreview`, and focused
component tests. Preserve current Coach/Tree/Planner API wrappers and response
validators, server routes/services, provider behavior, persistence, context
selection, practice links, and visual Tree work.

| ID     | Required behavior                                                                                                                  | Planned implementation                                                                                                                                                                                                                                                                                                                                                                                                                 | Independent proof                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R14-01 | One accessible `Refresh Coach` action reloads Roadmap, Tree, Planner for current selected context.                                 | `CoachWorkspace` owns monotonically increasing refresh epoch, selected-context key, pending panel set, and public refresh status. It starts one epoch only when no cycle is active; button remains disabled only while that epoch has pending panels.                                                                                                                                                                                  | Workspace test asserts one click triggers current-context Roadmap, Tree, skill-profile, and plan reloads exactly once.                                      |
| R14-02 | Prior content remains visible while latest request runs, until replacement or labelled failure.                                    | Each panel distinguishes initial load from refresh. Existing validated content remains rendered; it adds local updating text instead of replacing content with `LoadingState`. New data replaces only after current epoch succeeds.                                                                                                                                                                                                    | Deferred promises prove prior roadmap/tree/plan remain visible during refresh, then replace only with latest result.                                        |
| R14-03 | Obsolete work cannot replace newer context or epoch.                                                                               | Each panel retains its abort controller/request guard. Workspace ignores panel outcomes unless epoch and context key match active cycle; context change invalidates active cycle before panels receive new props and abort their in-flight requests.                                                                                                                                                                                   | Deferred old-context requests are aborted/ignored after context switch; only new-context results and status render.                                         |
| R14-04 | Status is honest: updated view, no new evidence, syncing, or retryable failure; never claims new evidence/inference without proof. | Panels report only validated display signatures plus `ready`/`pending`/error outcomes. Coordinator compares current signatures with each panel's last successful signature for same context. It says `No new evidence` only when all ready signatures match; `Evidence still syncing` when any current result is pending; otherwise `Updated Coach view using current saved evidence`; errors use existing safe text and retry action. | Tests cover equal signatures, changed display signature, pending evidence, and rejection; assertions prohibit readiness/hiring/provider/raw-error language. |
| R14-05 | Retry starts one fresh coherent cycle without clearing selection/prior content.                                                    | Coordinator exposes `Retry Coach` only after failed cycle; it creates next epoch for current context. Existing per-panel retry controls delegate to that coordinator during shared mode; standalone component fallback remains local.                                                                                                                                                                                                  | Rejection then retry reloads all panels, retains old content/form context, and no duplicate cycle begins while pending.                                     |
| R14-06 | No hidden contract expansion.                                                                                                      | No endpoint, query, DTO, server, provider, persistence, package, or CSS/tree-visual change. Use existing abort signals and safe component state only.                                                                                                                                                                                                                                                                                  | Final diff and existing API-wrapper tests show no server/API/provider/persistence edits.                                                                    |

**Execution sequence:**

1. Add workspace refresh-cycle state: epoch, context key, pending
   `roadmap`/`tree`/`planner`, per-panel latest safe outcome, and live-status
   text. Invalidate an old cycle before context change.
2. Pass epoch/context key and completion callback to panels. Keep existing abort
   guards. Shared refresh retains valid view, reports success only after safe
   renderable response, and reports error only for current epoch.
3. Treat Planner as complete only after plan preview and skill-profile refresh
   settle. Safe empty-skill fallback is not provider/transport failure; plan
   failure remains retryable.
4. Centralize shared-mode retry through `CoachWorkspace`; preserve standalone
   panel retry behavior for existing direct component tests.
5. Add `CoachWorkspace.test.jsx`; extend direct panel/preview tests only for
   callback and retained-content behavior. Do not add browser automation.

**Required verification matrix:**

| Category      | Required proof                                                                                                                  | Status before approval     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Success       | All three surfaces reload for Overall, Target, Project current context.                                                         | Planned                    |
| Loading/state | Button disabled only during one cycle; content retained; duplicate click blocked.                                               | Planned                    |
| Concurrency   | Context switch aborts/ignores old epoch; old completion cannot overwrite newer result.                                          | Planned                    |
| Recovery      | One panel failure preserves last valid panel content, safe error, shared retry.                                                 | Planned                    |
| Honest state  | Equal signatures say `No new evidence`; pending says `Evidence still syncing`; changed view avoids claim evidence changed.      | Planned                    |
| Accessibility | Named button, `aria-live` cycle result, keyboard operation; no loading-only hidden content.                                     | Planned                    |
| Regression    | Existing direct Coach/Tree/Planner/preview tests, practice links, selection payloads remain green.                              | Planned                    |
| N/A           | Auth/ownership, persistence, provider failure, migration, upload, server/API tests: client read-state coordinator changes none. | N/A — no affected boundary |
| Documentation | Reconcile R1-R14 disposition and live status; run delivery validation.                                                          | Planned                    |

**Focused commands after implementation:**

```sh
npm test --workspace=client -- --run src/components/coach/CoachWorkspace.test.jsx src/components/coach/CoachPanel.test.jsx src/components/coach/CoachTreePanel.test.jsx src/components/coach/CoachPlannerPanel.test.jsx src/components/interview/InterviewPlannerPreview.test.jsx
npm run lint --workspace=client
npm run validate:delivery
git diff --check
```

**Stop gates:** Stop for renewed approval if coordination requires a new API
field/endpoint, server/service/provider/persistence change, browser smoke,
package, altered practice-start contract, raw evidence comparison, or an
evidence-change claim without validated comparison.

**Implementation approval request:** Approve **R1-14 Coach refresh
coordination** only: client workspace/panel/preview state changes, focused
component tests, client lint, formatting, delivery validation, and diff check.
No browser, provider, server/API/persistence, dependency, deployment, commit,
or push action.

### R1-15 complete implementation plan — deterministic Coach, Planner, and Tree guidance

**Status:** Implemented and verified locally.

**Proven boundary:** Roadmap already applies the documented deterministic order
but discards target weight and returns no ranking explanation. Planner already
returns a validated selected level but does not explain it. Tree already returns
validated selected context and context-to-branch/branch-to-skill edges, but the
UI does not explain either. R1-15 adds only safe deterministic projection/copy:
no provider, raw source facts, new ordering rule, persistence, start-contract,
package, CSS/SVG, or browser work.

**Definitions retained:** Overall uses the existing recommended
weak/non-established skill; Target uses saved weight, then evidence, mastery,
confidence, and stable order; Project uses confirmed coverage needing evidence
before stable keys. Tree links mean selected context → saved requirement or
confirmed coverage category → tested skill. An evidence count is the bounded
number of saved answer-derived evidence points, not a score, prompt count,
hidden rationale, or hiring signal. A level explanation describes only
deterministic preview coverage, never readiness, generated questions, or an
outcome.

#### Requirement traceability matrix

| ID     | Authority                        | Required result                                                                                                                                                         | Bounded implementation                                                                                                                                                                                                                                         | Independent proof                                                                                                                                                |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R15-01 | E4; API Design E4; R1-R15        | Coach shows selected context, deterministic priority/ranking reason, and priority/evidence/mastery/confidence definitions without a readiness/hiring claim.             | Add each safe Roadmap skill `ranking: {priority: 1..12, reason}`. Reason is fixed: `overall_recommended`, `target_weight_then_evidence`, or `project_coverage_attention`; derive it only at current service sort/cap point. Client maps code to fixed wording. | Service/route/API parser/component tests: Overall, Target, Project, no evidence, pending, weak, established, invalid/missing/extra ranking field.                |
| R15-02 | E6; planner API contract; R1-R15 | Planner states selected level expectation, deepen/clarify/recover/switch rule, five-question cap, and non-prewritten status.                                            | Fixed local message from validated response `selection.level`: beginner core concept + example; intermediate approach + trade-off + example; advanced constraints + alternatives. Keep endpoint and start handoff unchanged.                                   | API/Preview/Coach Planner/Practice tests: beginner/intermediate/advanced, generic/Role/Project/focus, malformed, retry, stale selection, unchanged start link.   |
| R15-03 | E5; API Design E5; R1-R15        | Tree states selected context, parent-to-skill relationship, evidence-count/mastery/confidence meanings, omission, replay, and next action from safe returned data only. | Render `tree.context.label`; derive parent sentence only from validated branch-edge membership; use fixed metric definitions. Preserve semantic list, existing replay/practice links, caps, and visual decoration.                                             | Tree parser/component tests: Overall/Target/Project, zero evidence, pending, omitted skills, malformed context/graph, failure/retry, exact relationship wording. |
| R15-04 | AGENTS; V2 interface rules       | No unsafe or hidden contract expansion.                                                                                                                                 | No provider/model schema, persistence, migration, auth/ownership/rate-limit, package, upload, endpoint/query/start change, or browser action.                                                                                                                  | Final diff boundary, focused checks, lint, delivery validation, whitespace check.                                                                                |

#### Contract and rendering matrix

| Surface | Existing safe input                                              | R1-15 addition                                                       | Explicitly forbidden                                                                                               |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Roadmap | Context label, safe skills, service order, sync status           | Safe ordinal and fixed reason code; UI metric definitions            | Numeric target weight, JD/project/answer/feedback text, provider payload, hidden reasoning, readiness/hiring claim |
| Planner | Validated selection level, safe stages/rationale/adaptive notice | Fixed selected-level expectation and complete adaptive-stage wording | Generated prompt, score/prediction, difficulty/readiness guarantee, provider data                                  |
| Tree    | Context, safe nodes/edges/metrics, omitted count, replay path    | Context text, parent sentence, metric definitions                    | Raw requirement/JD/project facts, IDs, answer/provider data, invented link, hiring/readiness claim                 |

#### Planned task and file matrix

| Task    | Files / exact work                                                                                                                                                                                       | Risk control and proof                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| R15-T01 | `server/src/services/coachRoadmapService.js`; `server/tests/integration/coachRoutes.test.js`: preserve comparator and attach final-list ordinal plus allow-listed reason.                                | Do not return weight; preserve safe cap/order/actions. Assert exact route output for all contexts.                         |
| R15-T02 | `client/src/api/coachApi.js`, `client/src/api/coachApi.test.js`, `client/src/components/coach/CoachPanel.jsx`, focused Coach tests: validate exact `ranking`, render fixed trainer copy.                 | Unknown code, missing/extra property, or invalid ordinal takes existing malformed-response recovery; no client re-ranking. |
| R15-T03 | `client/src/components/interview/InterviewPlannerPreview.jsx`, `client/src/components/coach/CoachPlannerPanel.jsx`, Preview/Planner/Practice tests: add level/adaptive guidance from response selection. | No server/API edit; prove validated response—not local controls—drives text; start parameters unchanged.                   |
| R15-T04 | `client/src/components/coach/CoachTreePanel.jsx`, `client/src/api/coachTreeApi.test.js`, Tree tests: render context, edge-backed relationship, and metric guidance.                                      | Never infer absent/invalid edge; retain list fallback; no CSS/SVG/browser work.                                            |
| R15-T05 | `project_memory/IMPLEMENTATION_STATUS.md`, `project_memory/REMEDIATION1.md`: reconcile actual results/deviations after checks.                                                                           | No completion claim unless every approved row has passing evidence.                                                        |

#### Required verification matrix

| Category             | Required proof                                                                                                              | Expected result                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Success              | Roadmap Overall/Target/Project; Planner generic/Role/Project/focus at every level; Tree Overall/Target/Project relationship | Exact displayed explanation derives only from validated deterministic state.                     |
| Empty/evidence       | Coach no-evidence/weak/established/pending; Planner empty weak-skill selector; Tree no-evidence/pending/omitted             | Honest definitions and existing actions/recovery stay usable.                                    |
| Validation           | Ranking missing/extra/invalid; existing plan exact-shape/mismatched-selection; Tree malformed context/node/edge             | Existing safe malformed-response path, no unsafe rendering.                                      |
| Recovery/concurrency | R1-14 refresh/retry/stale behavior, Planner stale selection/start link, Tree replay/practice links                          | New copy does not change request guards, retained content, or links.                             |
| Security/scope       | Diff and assertions                                                                                                         | No raw source/provider data, side effect, changed sort/evidence formula, or unapproved boundary. |
| Accessibility        | Text labels in Coach; preview text; semantic ordered Tree list                                                              | Content is not colour-only and remains available without wide visual tree.                       |
| N/A                  | Auth, ownership, rate limit, persistence, migration, upload, provider, deployment                                           | N/A: no affected endpoint authorization or side effect.                                          |

#### Execution sequence and stop gates

1. Add/test the Roadmap projection first; calculate priority from final existing
   order only, then tighten the exact client parser and render fixed copy.
2. Add Planner guidance solely from the validated plan response; prove Practice
   handoff parameters are unchanged.
3. Add Tree guidance solely from validated context/nodes/edges; do not alter
   CSS/SVG or visual-tree behavior.
4. Run focused server/client/API/component tests, affected lint, formatting,
   delivery validation, and diff check; record only actual results.

Stop for renewed approval if a new endpoint/query/start field, changed ordering
or evidence formula, provider/model/schema call, persistence/migration, package,
browser automation, CSS/SVG change, raw source fact, or non-fixed claim is
needed.

#### Focused verification commands after implementation

`npm test --workspace=server -- tests/integration/coachRoutes.test.js tests/integration/interviewPlanRoutes.test.js`; `npm test --workspace=client -- --run src/api/coachApi.test.js src/api/coachTreeApi.test.js src/api/interviewPlanApi.test.js src/components/coach/CoachPanel.test.jsx src/components/coach/CoachTreePanel.test.jsx src/components/coach/CoachPlannerPanel.test.jsx src/components/interview/InterviewPlannerPreview.test.jsx src/pages/PracticePage.planner.integration.test.jsx`; `npm run lint --workspace=server`; `npm run lint --workspace=client`; `npm run validate:delivery`; `git diff --check`.

**R1-15 local closure:** Roadmap now returns bounded ordinal priority plus a
fixed deterministic reason code without target weights. Coach renders that
reason and fixed evidence/mastery/confidence definitions. Planner renders
fixed validated-level and adaptive-coverage guidance. Tree renders returned
selected context, edge-backed parent grouping, and complete metric definition.
Server focused tests passed 10/10; client focused tests passed 22/22; server
lint passed with pre-existing intentional control-regex warning only; client
lint passed. No browser/provider/deploy/commit/push occurred.

### Required execution order

1. R1-14 and R1-15 are locally complete.
2. Separately approve one
   focused browser proof for R1-05. No provider smoke is implied.

### R1-17 trainer-copy inventory

| Surface               | Source location                                                                                                    | Required trainer meaning and replacement direction                                                                                                                     | Current evidence                                                                          | Owning remediation                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| Coach                 | `client/src/components/coach/CoachPanel.jsx`                                                                       | Context, ranking/priority, evidence meaning, next action, bounded outcome, recovery. Add only saved-data explanation; never readiness/hiring claim.                    | Safe ordinal/reason and metric definitions implemented; focused proof passes.             | R1-15 complete locally             |
| Planner               | `client/src/components/interview/InterviewPlannerPreview.jsx`; `client/src/components/coach/CoachPlannerPanel.jsx` | Coverage purpose, level expectation, adaptive rule, five-question cap, non-prewritten notice, context rationale. Add fixed level explanation, not generated questions. | Validated-level/adaptive copy implemented; focused proof passes.                          | R1-15 complete locally             |
| Tree                  | `client/src/components/coach/CoachTreePanel.jsx`                                                                   | Selected context, parent-to-skill relationship, mastery/confidence/evidence-count definitions, next action/replay, omission. Explain only returned derived fields.     | Context/edge-backed relationship/metric copy implemented; browser proof remains deferred. | R1-15 complete locally             |
| Job Targets           | `client/src/pages/TargetsPage.jsx`                                                                                 | Saved role analysis, priority/weight meaning, Role Simulation next action, no hiring prediction.                                                                       | Implemented and component-tested.                                                         | No new code; retain R1-12 evidence |
| Skills                | `client/src/pages/SkillsPage.jsx`                                                                                  | Saved evidence meaning, focused-practice action, no readiness prediction, safe recovery.                                                                               | Implemented and component-tested.                                                         | No new code; retain R1-12 evidence |
| Project README import | `client/src/pages/ProjectsPage.jsx`                                                                                | Transient/unconfirmed status, review, explicit confirmation, failure/retry, manual/resume preservation. Show bounded review metadata and explicit retry.               | Unconfirmed status exists; review/retry incomplete.                                       | R1-16                              |

### R1-12 local implementation evidence

- Mock Job Target analysis now maps fixed backend/API, frontend/interaction,
  and data/analysis keyword profiles from supplied descriptions. Sparse matches
  remain visibly broad mock coverage; no requirement is invented.
- Target and Skills guidance now describes saved context/evidence, next practice,
  and bounded outcomes without readiness or hiring claims.
- Passed: Job Target provider unit tests 9/9, Job Target route tests 11/11,
  Target/Skills component tests 4/4, client/server lint, delivery validation,
  and whitespace diff check.
- Unchanged: Gemini path, provider configuration, schemas, persistence, API
  contracts, README/import scope, browser proof, deployment, commit, and push.

### R1-09 implementation plan recovered from R1-08

**Status:** Planned only. Requires separate implementation approval.

**Proven gap:** `ProjectForm` preserves manual facts and selected resume after
extraction failure, but provides no extraction-specific retry. Each new click
creates a new idempotency key. If a browser loses a successful response, that
new key can repeat provider work instead of retrieving the existing bounded
transient result.

**Approved-candidate scope when implemented:**

1. Keep one extraction attempt key for the selected resume until success,
   explicit cancellation, source change, or navigation. Reuse that key only
   for the labelled extraction retry.
2. On extraction failure, retain selected resume, manual fields, and existing
   unconfirmed suggestions. Show the existing safe public error plus `Retry
suggestions`; manual confirmation/save remains usable.
3. Keep extraction server-side, authenticated, owner-scoped, bounded, and
   transient. Use existing request cache semantics; do not persist suggestions
   before user review and confirmation.
4. Do not change Gemini prompts/models, environment variables, provider
   normalization, automatic retry policy, routes, schemas, database models,
   upload behavior, or public error codes/messages.
5. Treat other AI paths as regression boundaries only: Job Target analysis,
   question/adaptive generation, V1/V2 evaluation, and voice already have
   scoped draft/session/retry or typed-fallback behavior. Do not add a common
   retry mechanism, because duplicate question/evaluation effects are unsafe.

**Required implementation evidence:**

| Requirement                          | Independent proof                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same attempt is safe to retry        | Client test verifies failed extraction keeps source/form/drafts and retries with same idempotency key; source change creates a new key.            |
| No accidental save or duplicate work | Client test verifies retry never creates project; service test verifies same user/key/source returns cached drafts and conflicting source rejects. |
| Safe recovery                        | Error UI exposes only existing public text, provides `Retry suggestions`, retains manual entry, and does not render raw provider/resume content.   |
| Adjacent AI behavior unchanged       | Focused existing Job Target, Practice text/adaptive/evaluation, and Voice fallback tests pass without service/provider changes.                    |
| Scope guard                          | Diff has no dependency, provider/configuration, schema/API, upload, persistence, deployment, commit, or push change.                               |

**Stop gates:** stop and seek approval if same-key retry needs a new API
contract, server persistence, provider retry, altered public error mapping,
raw failure diagnostics, configuration inspection beyond variable-name
presence, live provider call, or a change to any other AI workflow.

**Excluded:** README/Markdown import, uploads, actual provider diagnosis,
credential/key work, Gemini change, automatic retry, browser smoke, deployment,
commit, and push.

**Implementation approval request:** Approve **R1-09 resume-project
suggestion recovery** only: attempt-key reuse, retry UI, draft preservation,
focused client/service/regression tests, affected lint, delivery validation,
and diff check.

### R1-09 local implementation evidence

- `ProjectForm` now keeps one transient extraction key for selected resume,
  reuses it only through `Retry suggestions`, and resets it after success or
  source selection change.
- Failure retains source, manual edits, and already-rendered unconfirmed
  suggestions. The retry remains extraction-only and cannot save a project.
- Passed: ProjectsPage client tests 7/7; project service/route tests 12/12;
  Practice recovery regression tests 39/39; client/server lint; diff check.
- Unchanged: provider normalization/configuration, Gemini behavior, routes,
  schemas, persistence, public error contract, upload scope, browser proof,
  deployment, commit, and push.

### R1-10 complete implementation plan — README/Markdown project import

**Status:** Planned only. Requires separate implementation approval.

**User outcome:** In `ProjectForm`, user can choose one project README/text
file, receive one editable _unconfirmed_ draft, review bounded unmatched text,
and use existing confirmation/save action. Import never creates a project,
never becomes an asserted project fact, and does not require AI.

**Exact import boundary:**

1. Add `POST /api/projects/readme-draft` before `/:id`, protected by
   `requireAuth` and existing upload user/IP rate limiter. It accepts exactly
   one multipart field named `readme`.
2. Add dedicated disk-backed temporary upload middleware; never reuse PDF
   resume storage. Accept only `.md`, `.markdown`, or `.txt` names with one of
   `text/markdown`, `text/x-markdown`, or `text/plain` MIME types. Reject empty,
   multiple, unexpected, mismatched, or oversized files before parsing.
3. Introduce only documented optional server settings:
   `MAX_README_IMPORT_SIZE_BYTES` default `262144` and
   `README_IMPORT_UPLOAD_DIR` default `/tmp/mockmateai-readme-imports`.
   Add both names, defaults, order, and sections to `.env.example` without
   copying local values. Reuse existing bounded upload rate limits.
4. Parser reads at most `262144` bytes, decodes UTF-8 with fatal decoding,
   strips optional BOM, rejects NUL/control-character binary indicators, and
   rejects decoded text above `100000` characters. It always removes temporary
   file in `finally`; upload middleware removes files when multer rejects.
5. Parser recognizes normalized headings and bullet/paragraph content:
   `name` from first H1 or `Project`/`Name`; `summary` from
   `Summary`/`Overview`/`Description`; `role` from `Role`/`My role`;
   `technologies` from `Technologies`/`Tech stack`/`Tools`; `architecture` from
   `Architecture`/`System design`; `responsibilities` from
   `Responsibilities`/`Contributions`; `decisions` from `Decisions`;
   `tradeoffs` from `Trade-offs`/`Tradeoffs`; `claims` from `Claims`/`Results`.
   No heading means no inferred field.
6. Normalize whitespace, remove Markdown list/heading decoration, preserve
   document order, de-duplicate case-insensitively, and enforce existing
   project-field item/string caps before response. Invalid/short extracted
   values are reported as missing rather than padded, merged, or invented.
7. Return only `{ draft, review }`: draft contains parsed editable fields plus
   `source: "readme_import"`; review contains recognized section names,
   missing required field names, omitted-line count, and at most 20 unmatched
   lines/2000 characters. Raw input is never logged, persisted, or returned
   outside this bounded response.
8. `ProjectForm` adds import control beside resume/manual source. It has local
   extension/size validation, one in-flight request, loading/error/retry
   states, accessible label/status, and preserves manual form/resume selection
   on failure. Successful import adds one clearly labelled unconfirmed draft;
   user must choose `Review this draft`, which fills local form and resets
   confirmation. Existing manual and resume-suggestion paths remain unchanged.
9. Saving remains existing `POST /api/projects` or update route with existing
   confirmation validation. No README content, filename, storage key, source
   identifier, or unrecognized excerpt is sent to or saved by `CandidateProject`.

**Required tests and acceptance evidence:**

| Boundary           | Required proof                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parser             | Deterministic fixtures map only recognized headings; order/de-duplication/caps hold; missing values remain missing; unmatched review output is bounded.                              |
| File safety        | Reject unauthenticated, missing, empty, multiple, unexpected, wrong extension/MIME, binary, invalid UTF-8, oversized byte/character inputs; no parser/model/provider call.           |
| Cleanup/privacy    | Success, parser failure, validator failure, and persistence-independent failure leave temporary directory empty; response/logs omit full text, filename, path, and storage key.      |
| Authorization/rate | Auth-derived user only; upload limiter applies before file processing; no cross-user data or identifier exists.                                                                      |
| UI/recovery        | File validation, loading, safe error/retry, manual facts/resume selection preservation, bounded review display, unconfirmed status, and confirmation reset are tested.               |
| Regression         | Existing manual project, resume suggestions, confirmation/save, Project Defense snapshot, resume upload, and text interview tests pass.                                              |
| Final gates        | Focused client/server tests, affected lint, delivery validation, diff check, and env-example parity pass. Browser smoke, provider calls, deployment, commit, and push stay excluded. |

**Stop gates:** Stop for user direction if browser supplies no allowed MIME,
requirements demand raw README persistence, import needs AI/provider work,
existing confirmation cannot represent draft safely, new dependency is needed,
temporary cleanup cannot be proven, or route/model/schema scope expands.

**Implementation approval request:** Approve **R1-10 transient README/Markdown
project import** only: dedicated bounded upload/parser/API/UI flow, temporary
cleanup, existing confirmation reuse, environment-example parity, focused tests,
affected lint, delivery validation, and diff check. Excludes AI/provider calls,
browser smoke, deployment, commit, and push.

### R1-10/R1-16 local implementation evidence — Passed locally

- Added authenticated, rate-limited `POST /api/projects/readme-draft` with one
  transient `.md`, `.markdown`, or `.txt` file; separate temporary storage;
  UTF-8/binary/size checks; deterministic parser; and `finally` cleanup.
- Added local ProjectForm import/review control. Imported content remains an
  editable unconfirmed draft; existing confirmation is still required to save.
- Added environment names/defaults to server examples. No raw README, filename,
  storage key, or source identifier is persisted in `CandidateProject`.
- R1-16 makes short extracted scalar/list values missing instead of retaining
  them; client validates bounded draft shape before rendering.
- R1-16 adds explicit upload retry while retaining manual form values, plus
  recognized/missing/omitted/unmatched review details before existing draft
  selection and confirmation.
- Passed: README route/service tests 14/14 cover auth/rate/missing/empty/
  multiple/unexpected-field/wrong-type/binary/invalid-UTF-8/oversize rejection,
  cleanup, and safe response projection. Client API/Projects tests 17/17 cover
  malformed response rejection, retry, manual preservation, review, and confirmation.
  Client/server lint pass; server retains one intentional control-character-regex
  warning for binary detection.
- Unchanged: AI/provider calls and configuration, confirmed-project model,
  resume flow, browser proof, deployment, commit, and push.

### R1-13 complete remediation plan — shared Gemini structured-output and deadline reliability

**Status:** Planned only. Requires separate implementation approval. This plan
records an evidence-backed remediation for the reported project-suggestion
failure and a preventive review of every shared AI operation. It authorizes no
provider request, credential/configuration mutation, deployment, commit, or
push.

**Confirmed evidence:** `POST /api/projects/extract` returned public
`502 AI_PROVIDER_UNAVAILABLE` after `12,836ms`, with safe internal category
`provider_rejected`. This category represents an upstream 400/409/415/422; it
does not indicate quota, authentication, permission, model-not-found, timeout,
or network/service unavailability. The browser project API deadline is
`12,000ms`, while the configured server provider budget is `20,000ms`, so the
browser can display `Request took too long` before the controlled server result.

The outbound Gemini `responseJsonSchema` for project suggestions uses
`nullable: true` for `claims[].evidence`; adaptive questions also use it for
`parentQuestionOrder`. Gemini's documented JSON Schema form represents nullable
values with a type array such as `type: ["string", "null"]`, not OpenAPI
`nullable`. The exact upstream message was intentionally not retained; this is
therefore the highest-confidence proven request-shape defect, not a claim about
credentials or account state.

**User outcome:** Resume suggestions complete within an honest client deadline
or return the existing safe server error. Role Simulation, Project Defense, and
targeted practice never send an unsupported nullable structured schema. Other
AI workflows retain validated output, bounded time, safe recovery, and their
existing no-duplicate rules.

#### Operation disposition

| Operation / surface                                 | Adapter path                          | Audit result                                                                                  | Planned disposition                                                                            |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Resume project suggestions                          | `extractProjectDrafts`                | Unsupported nullable schema; client deadline is too short.                                    | Fix schema compatibility and use `25,000ms` client deadline.                                   |
| Role Simulation, Project Defense, targeted practice | `generateAdaptiveQuestion`            | Unsupported nullable `parentQuestionOrder` schema.                                            | Fix through shared outbound-schema compatibility boundary.                                     |
| Standard questions                                  | `generateQuestion`                    | No nullable field found; existing `25,000ms` client deadline exceeds server budget.           | Regression boundary only.                                                                      |
| Typed V1/V2 evaluation                              | `evaluateAnswer` / `evaluateV2Answer` | No nullable field found; existing `25,000ms` client deadline exceeds server budget.           | Regression boundary only.                                                                      |
| Job Target analysis                                 | `analyzeJobTarget`                    | No nullable field found; existing `25,000ms` client deadline exceeds server budget.           | Regression boundary only.                                                                      |
| Voice transcription/evaluation                      | transcription adapter plus evaluation | Does not use Gemini structured-output schema; client deadline equals current provider budget. | No speculative change. Audit route-total timing; stop for a separately approved voice finding. |
| README/Markdown import                              | deterministic parser                  | No AI/provider call.                                                                          | No change; retain `12,000ms` local-parser deadline.                                            |
| Coach, Tree, Planner                                | deterministic read-only services      | No AI/provider call.                                                                          | No change.                                                                                     |

#### Requirement traceability and implementation plan

| ID      | Requirement / source                                             | Planned change                                                                                                                                                                                                                                                                            | Primary risk / mitigation                                                                                                                                                             | Required independent evidence                                                                                                                                                                         |
| ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-AI01 | Reported `provider_rejected`; Gemini structured-output contract  | Add one bounded outbound-schema compatibility function used by every `generateContent` operation. It converts nullable scalar schemas to JSON Schema type arrays and excludes unsupported OpenAPI-only `nullable`; local output validators retain all product length/content constraints. | A broad schema rewrite could weaken validation. Preserve source schemas for local validation; alter only outbound compatible representation; do not change prompts/models.            | Unit snapshots/captured requests for all six structured operations prove no outbound `nullable`, valid nullable type arrays, stable MIME/model/timeout, and unchanged local invalid-output rejection. |
| R1-AI02 | R1-AI01; V2 adaptive contract                                    | Correct project `claims[].evidence` and adaptive `parentQuestionOrder` nullable representations, including no-prior-question and prior-question branches.                                                                                                                                 | `null` may be accepted where product contract disallows it. Existing output validators remain authoritative and must reject invalid values.                                           | Project/adaptive provider tests prove allowed `null` only where contract permits and preserve required enum/order constraints.                                                                        |
| R1-AI03 | Reported browser timeout; finite-timeout reliability requirement | Change only `extractProjectDrafts` client deadline from `12,000ms` to `25,000ms`, leaving its server `20,000ms` total budget unchanged.                                                                                                                                                   | A shared HTTP timeout change could affect unrelated calls. Change only project extraction; preserve abort signal and idempotency key.                                                 | API-wrapper test asserts `25,000ms`; UI recovery test proves one aborted/failed attempt retains draft/source and explicit same-key retry.                                                             |
| R1-AI04 | Shared safe-error/recovery contract                              | Preserve public error code/message, safe category-only logging, manual project entry, transient cache, and R1-09 retry. Do not auto-retry `provider_rejected`; do not expose upstream error text.                                                                                         | A schema defect could trigger duplicate paid calls or disclose provider detail. Keep extraction retry user-driven/same-key; assert one provider call per key and safe log projection. | Route/service/UI tests simulate 400 rejection and assert safe response, no persistence, retry eligibility only through existing same-key path, no raw provider/resume data.                           |
| R1-AI05 | All shared AI operations                                         | Inventory all provider call sites and enforce outbound-schema compatibility for adaptive, Job Target, project extraction, standard question, V1 evaluation, and V2 evaluation. Keep voice under its separate adapter contract.                                                            | A fix for projects regresses questions/evaluations. Captured-request tests cover every structured operation; existing targeted lifecycle tests remain green.                          | Focused provider tests plus directly affected project/adaptive/interview/evaluation/target regressions.                                                                                               |
| R1-AI06 | Provider/security and delivery assurance                         | Keep backend-only key handling, finite aborts, rate limits, validation before render/save, owner-derived queries, and safe failure logs. No live provider smoke is needed for deterministic compatibility proof.                                                                          | Diagnostic work might broaden into account/config changes. No `.env` values, key rotation, model/provider switch, package, migration, deploy, commit, or push.                        | Diff review, secret scan, affected lint, delivery validation, and documentation reconciliation.                                                                                                       |

#### Execution sequence

1. Establish failing deterministic request-shape tests for project extraction
   and both adaptive nullable branches. Add captured-request coverage for every
   structured Gemini operation before source changes.
2. Add the smallest shared Gemini outbound-schema compatibility boundary. Keep
   prompts, adapters, public contracts, output validators, cache, and retry
   policy unchanged.
3. Change only project extraction's client deadline to `25,000ms`; retain the
   `20,000ms` server total provider budget and existing abort/idempotency flow.
4. Prove `provider_rejected` remains a safe, non-automatic-retry result:
   no project persistence, no duplicate provider work for the same attempt,
   manual entry and R1-09 retry remain available, and no raw upstream data is
   logged/rendered.
5. Run focused provider, project route/service/UI, adaptive/interview, Job
   Target, and typed evaluation regressions; then affected client/server lint,
   `npm run validate:delivery`, formatting, and `git diff --check`.
6. Reconcile this plan and `IMPLEMENTATION_STATUS.md`. Browser smoke and one
   configured-provider request remain separate approval gates; neither is
   required to prove the deterministic request contract.

#### Verification matrix

| Category                    | Planned proof                                                                                                                  | Status                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Success                     | Project suggestions use compatible schema and `25,000ms`; all structured operations create compatible requests.                | Pending implementation approval   |
| Validation                  | Local output validators still reject malformed/extra/invalid provider output after outbound normalization.                     | Pending implementation approval   |
| Authentication/ownership    | N/A: no route/query/auth change; retain existing owner-scoped project/interview tests.                                         | N/A with regression coverage      |
| State/concurrency           | Same extraction key replays transient result; failure creates no project and no duplicate operation.                           | Pending implementation approval   |
| Dependency/provider failure | Deterministic 400 rejection maps safely and is not auto-retried; timeout remains bounded.                                      | Pending implementation approval   |
| Persistence failure         | N/A: no model/write transition change; project failure remains transient.                                                      | N/A with project-route regression |
| Recovery/retry              | Source/manual draft/unconfirmed suggestions persist; user-controlled same-key retry remains available.                         | Pending implementation approval   |
| Privacy/security            | No provider message, prompt, resume text, key, payload, stack, or config value enters API/UI/logs.                             | Pending implementation approval   |
| Regression                  | Standard/adaptive questions, V1/V2 evaluations, Job Target, voice fallback, README parser, Coach/Tree/Planner retain behavior. | Pending implementation approval   |
| Documentation               | Status, plan, source list, findings, and approval boundary match final behavior.                                               | Pending implementation approval   |

#### Expected files and hard boundaries

| Action           | File / boundary                                                                                                 | Purpose                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Modify           | `server/src/services/geminiProvider.js`                                                                         | Compatible outbound structured schemas only.                                              |
| Modify/add tests | `server/tests/unit/projectProvider.test.js`, adaptive/provider tests, and narrowly affected route/service tests | Prove all structured request shapes, output validation, safe rejection, and preservation. |
| Modify           | `client/src/api/projectApi.js`, `client/src/api/projectApi.test.js`                                             | Project extraction deadline only.                                                         |
| Modify/add tests | `client/src/pages/ProjectsPage.test.jsx`                                                                        | Deadline/recovery/idempotency UI proof only if existing tests lack it.                    |
| Modify           | `project_memory/IMPLEMENTATION_STATUS.md`, this document                                                        | Evidence, findings, and completion reconciliation.                                        |

**Stop gates:** Stop and request renewed approval if compatibility requires a
provider/model change, package update, SDK migration, environment value change,
new public error contract, automatic retry, persistence/schema migration, raw
provider diagnostics, voice behavior change, browser smoke, live provider call,
deployment, commit, or push.

**R20-11 evidence:** Entry-title/body chunking and deterministic five-entry
selection passed focused server tests `34/34`; no provider call occurred.

**Implementation approval request:** Approve **R1-13 shared Gemini
structured-output and project-deadline remediation** only: deterministic shared
outbound-schema compatibility, project client deadline, focused tests, affected
lint, delivery validation, documentation reconciliation, and diff checks.
No live provider, browser, environment/configuration mutation, dependency,
deployment, commit, or push.

### R1-18 local implementation evidence — Passed locally

- Extended only `toGeminiResponseJsonSchema` to remove `minLength` and
  `maxLength` from outbound structured schemas. Existing `nullable` conversion
  to JSON Schema type arrays remains unchanged.
- Retained source schemas and all local output validators, so product length
  bounds continue to reject invalid provider output before render or save.
- Passed: captured-schema unit tests for adaptive question, Job Target,
  project extraction, standard question, V1 evaluation, and V2 evaluation:
  56/56. Server lint passed with the pre-existing intentional README
  control-character-regex warning; targeted Prettier and diff checks passed.
- No live provider, configuration, prompt, model, retry, API, persistence,
  browser, deployment, commit, or push action occurred.

### R1-13 local implementation evidence — Passed locally

- Added one shared outbound Gemini response-schema compatibility transform. It
  converts only `nullable: true` scalar fields into JSON Schema type arrays and
  removes `nullable` before every structured provider request. Local output
  validators, prompts, models, provider selection, server timeouts, rate
  limits, cache, and retry policy remain unchanged.
- Covered all six structured operations with captured-request checks: adaptive
  question, Job Target analysis, project extraction, standard question, V1
  evaluation, and V2 evaluation. Project claim evidence and adaptive parent
  question order now send `type: ["string", "null"]` and
  `type: ["integer", "null"]` respectively.
- Changed only resume-project extraction client timeout from `12,000ms` to
  `25,000ms`; configured backend budget remains `20,000ms`. README import and
  voice deadlines remain unchanged.
- Added integration evidence that an upstream 400 normalizes to the existing
  safe `502 AI_PROVIDER_UNAVAILABLE`, persists no project, emits no upstream
  detail, and makes one provider call. Existing R1-09 UI retry keeps its
  idempotency key and manual draft state.
- Passed: focused server provider/project tests 70/70; focused client project
  API/UI tests 15/15; server/client lint; delivery validation; whitespace diff
  check. Server lint retains pre-existing intentional control-character-regex
  warning in README binary detection.
- Unchanged: no live provider/browser call, provider credentials/configuration,
  dependencies, API/database contract, migration, deployment, commit, or push.
- R1-18 closes former keyword gap: all outbound schemas now omit `nullable`,
  `minLength`, and `maxLength`; local validators preserve the original
  product constraints.

### R1-19 configured-provider synthetic extraction diagnostic — 2026-10-11

**Status:** Diagnostic complete. No remediation implementation is approved.

With explicit user approval, one synthetic bounded project-extraction context
was sent through the configured Gemini adapter. It made no database write,
project save, browser action, or user-resume submission. It failed after
`1,808ms` with public `AI_PROVIDER_UNAVAILABLE` and safe category
`provider_rejected`.

This rules out neither every possible user-resume characteristic nor every
request-shape factor; it does rule out a browser-only deadline as the complete
explanation. It proves an active configured-provider rejection in the project
extraction adapter path despite R1-13/R1-18 outbound-schema compatibility
checks. The app intentionally retains no upstream error message, so exact
provider field/model/config cause remains unproven. Do not claim a schema field,
credential, quota, or model cause without further approved evidence.

**Next approval boundary:** Plan and implement a shared configured-Gemini
compatibility remediation only after an approved diagnostic matrix establishes
the minimal accepted request configuration across project extraction, Job Target
analysis, question generation, V1/V2 evaluation, and adaptive generation. No
automatic retry, key/model rotation, environment mutation, raw-error logging,
deployment, commit, or push is implied.

### R1-19 complete implementation plan — shared Gemini live compatibility

**Status:** Planned only. Implementation and each configured-provider probe
need separate explicit approval. This plan does not authorize a provider call,
code/configuration change, package change, browser, deployment, commit, or
push.

**Objective:** Find and repair only the minimum shared Gemini request-profile
incompatibility affecting project extraction, Job Target analysis, standard
question generation, V1 evaluation, V2 evaluation, and adaptive generation.
Preserve local output validation, finite budgets, safe recovery, rate limits,
provider-neutral boundaries, and existing public errors. Voice remains outside
this scope; README/Markdown import makes no AI call.

**Safety decision:** Safe logging will not be stopped or weakened. No raw
upstream message, response, prompt, schema, user text, header, cookie, key,
stack, or full model configuration may be logged, returned, or persisted.
Diagnostic evidence is restricted to fixed operation/profile labels, rounded
duration, normalized error category, HTTP status class, and allow-listed SDK
code/name; absent or unfamiliar values become `unknown`.

#### Root-cause probe matrix

Each row is one synthetic fixed-input request, no API route/UI/database/persist,
no retry, output discarded, and at most `20,000ms`. Run P19-01 first. Every
later row requires both its preceding result and separate approval. Stop at the
first conclusive incompatibility or a non-rejection category.

| ID     | Request profile                                                             | Distinguishes                                                                 | Result action                                                                                                    |
| ------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P19-01 | Configured model; plain text; no response schema; no thinking configuration | Base GenerateContent/model/account acceptance from structured-request failure | If rejected, stop: model/account/environment/SDK/provider support decision is outside code-only remediation.     |
| P19-02 | P19-01 plus minimal JSON MIME type and minimal object schema                | Structured-output acceptance                                                  | If rejected, make one evidence-led central structured configuration change only.                                 |
| P19-03 | P19-02 plus current thinking configuration                                  | Thinking-configuration compatibility                                          | If rejected, remove or adjust only that documented unsupported profile feature.                                  |
| P19-04 | P19-03 plus current bounded extraction schema shape                         | Nested/current schema compatibility                                           | If rejected, narrow only the proven incompatible schema representation while keeping local validators unchanged. |

No probe may include a real resume, job description, answer, project draft, or
saved record. No probe may test a different model, rotate a key, mutate an
environment value, update the SDK, or repeat a failed request without a new
approved matrix row.

#### Requirement traceability and implementation matrix

| ID     | Required change                                                                                                        | Affected boundaries                                                                        | Risk and mitigation                                                                                                                                                                   | Independent proof                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| R19-01 | Add internal safe `probeProfile` labels and one allow-listed provider-signal extractor at the Gemini adapter boundary. | `geminiProvider`, provider-error normalization, safe logger; no public API/UI/persistence. | Metadata could leak user/provider data. Use closed enums and status class only; unknown fallback.                                                                                     | Unit tests prove raw error/message/schema/prompt/user text never enters emitted metadata.                                      |
| R19-02 | Centralize structured `generateContent` construction for all six structured operations.                                | Gemini adapter only: extraction, Target, question, V1/V2 evaluation, adaptive.             | Shared change can regress another operation. Preserve each prompt, source schema, local validator, model, budget, and public contract.                                                | Captured requests prove each operation receives the same validated central profile and its own unchanged schema/prompt inputs. |
| R19-03 | Apply exactly one probe-proven compatibility adjustment.                                                               | Central adapter profile only.                                                              | Guessing could mask root cause or broaden scope. No change before P19-02--P19-04 evidence; no model/key/SDK/public/retry change.                                                      | Synthetic post-change probe needs separate approval; deterministic tests prove all six operations.                             |
| R19-04 | Preserve extraction recovery and deadline contract.                                                                    | Project client/service/UI regression boundaries.                                           | Provider recovery can duplicate costly requests. Keep `25,000ms` client deadline, `20,000ms` server budget, same-key explicit retry, manual values/drafts, no persistence on failure. | Recovery tests prove retained manual/source/drafts, one provider call per attempt, and no automatic rejection retry.           |
| R19-05 | Preserve other lifecycle safety.                                                                                       | Target, question, evaluation, adaptive services; voice/README excluded.                    | Cross-cutting adapter update changes behavior. Keep validators before render/save, ownership, rate limits, bounded requests, and existing safe errors.                                | Focused operation tests plus malformed-output rejection and category mapping tests.                                            |
| R19-06 | Retain safe observability and public errors.                                                                           | Adapter, `aiProviderService`, error middleware/logger.                                     | Diagnostics expose sensitive data. Public `AI_PROVIDER_UNAVAILABLE` shape/message unchanged; only allow-listed internal metadata.                                                     | Logging/projection tests assert no raw provider data, secrets, or user content.                                                |

#### Execution and verification sequence

1. After implementation approval, add deterministic tests for R19-01/R19-02
   before source changes; no configured-provider request.
2. Add the smallest internal profile builder and safe signal extractor. Route
   all six structured operations through it without changing prompts, schemas,
   validators, models, budgets, retries, or public responses.
3. Run focused adapter/provider/lifecycle tests, affected server lint,
   formatting, `npm run validate:delivery`, and `git diff --check`.
4. Request separate approval for P19-01 only. If it passes, request only the
   next discriminating probe; if it fails, stop and report the safe category.
5. Apply only a result-supported R19-03 adjustment under renewed approval,
   then request one separate synthetic post-change proof. Reconcile final
   evidence honestly; browser/deployment/commit/push remain separate.

| Verification category       | Required proof                                                                                    | Status                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| Success                     | All six structured operations use one central, validated profile.                                 | Passed locally                  |
| Validation                  | Local output validators still reject malformed, extra, or out-of-range output.                    | Passed locally                  |
| Authentication/ownership    | N/A: no route/query/auth change.                                                                  | N/A with regression boundary    |
| State/concurrency           | Existing idempotency and bounded one-call lifecycle remain unchanged.                             | Passed locally                  |
| Dependency/provider failure | Synthetic probes remain one-call, finite, safely categorized, and non-retrying.                   | Pending separate probe approval |
| Persistence failure         | N/A: no write/model transition change; extraction remains transient until confirmation.           | N/A with project regression     |
| Recovery/retry              | Project manual/source/draft preservation and explicit same-key retry remain intact.               | Passed locally                  |
| Privacy/security            | Allow-list tests prove no provider/user/secret raw data reaches logs, API, or storage.            | Passed locally                  |
| Regression                  | Target, standard/adaptive questions, V1/V2 evaluation preserve contracts; voice/README unchanged. | Passed locally                  |
| Documentation               | Tracker, plan, approval boundary, and observed evidence agree.                                    | Passed locally                  |

**Stop gates:** Stop and request new direction if P19-01 rejects; a resolution
requires a model/key/account/environment/SDK/provider decision; validation must
be weakened; safe metadata cannot distinguish profiles; a second probe would be
needed without approval; or any public error, retry, persistence, voice, README,
browser, deployment, commit, or push change becomes necessary.

**Implementation approval request:** Approve **R1-19 safe shared Gemini
compatibility instrumentation and central structured configuration** only:
server adapter/error-metadata code, focused deterministic tests, server lint,
formatting, delivery validation, and diff check. No provider probe, model/key/
environment/SDK change, browser, deployment, commit, or push.

### R1-19 local implementation evidence — Partial

- Centralized all six structured Gemini request configurations in one internal
  `structured_json_v1` builder. Existing model, prompts, source schemas,
  outbound schema transform, token caps, temperatures, thinking configuration,
  timeout, retry policy, public errors, and local validators are unchanged.
- Provider failures now carry only internal allow-listed diagnostics: operation,
  profile, HTTP status class, and recognized SDK signal. Unknown values become
  `unknown`. Error logging keeps its existing request metadata and public API
  responses remain unchanged; raw provider/user/secret data is neither logged
  nor returned.
- Passed: focused adapter, extraction, Target, interview, and logging tests
  `117/117`; server lint passed with the existing intentional README
  control-character-regex warning; formatting and whitespace diff checks passed.
- No configured-provider request, model/key/environment/SDK change, browser,
  deployment, commit, or push occurred. P19-01 remains required to distinguish
  base configured-model acceptance before any compatibility adjustment.

## Addendum — R1-20 project intake completeness and trustworthy partial drafts

**Status:** Planned only. This addendum records the user-requested resolution
for resume and README project intake. It authorizes no code, provider request,
upload, browser action, persistence change, deployment, commit, or push.

### Observed facts and corrected diagnostic boundary

1. Practice question generation succeeds with the same configured Gemini
   service. It does not deterministically parse skills: it sends a flattened,
   first-`2,000`-character resume context to the provider and asks for a
   tailored question.
2. Resume-project extraction sends a flattened, first-`8,000`-character resume
   context to a materially larger nested structured-output request. Its current
   `provider_rejected` failure occurs before response validation, draft cache,
   or `CandidateProject` persistence. Therefore it is not evidence that the
   user's projects were absent or unrecognisable.
3. Uploaded resume PDFs are text-extracted then deleted. MongoDB stores only
   extracted text. Extraction is bounded by `5 MiB`, `20` pages, `50,000`
   extracted characters, and a finite worker deadline. The stored text keeps
   normalized page/newline separation, but both current provider contexts
   collapse whitespace; later content can be omitted by their context caps.
4. README import is deterministic and makes no AI call. It currently accepts
   one UTF-8 `.md`, `.markdown`, or `.txt` file up to `262,144` bytes and rejects
   decoded text above `100,000` characters. Recognized headings populate an
   unconfirmed draft; unknown text is only shown as bounded review excerpts.
5. Project Defense uses only a confirmed validated project snapshot, never raw
   resume or README text. Its deterministic coverage derives from nonempty
   saved architecture, technologies, responsibilities, decisions, trade-offs,
   and claims.

The earlier synthetic rejection proves a project-extraction request can be
rejected, but it does not prove every user resume is irrelevant to that failure.
Practice success now proves base account/model access and the simple structured
question profile work. Accordingly, P19-01 is no longer the next useful probe
for this incident; retain it as historical plan evidence only. The first future
provider diagnostic must isolate the project-specific request profile.

### User outcome and non-negotiable rules

- Resume and README intake copy only supported source details into one editable
  project form. Missing detail remains visibly missing; it is never invented.
- A sparse source must still produce a reviewable partial draft when it contains
  a plausible project signal. Do not omit it solely because all current
  confirmed-project fields are unavailable.
- User may edit, add, remove, or abandon a draft before confirmation. No import
  automatically creates a confirmed project or project fact.
- README and resume flows must state their source limits and preserve current
  manual-entry recovery.
- Project Defense remains grounded only in facts the user explicitly confirms
  and that satisfy a defined readiness contract. It must not turn incomplete
  source text into unsupported interview assertions.

### Required lifecycle decision before implementation

The user must choose this explicitly during implementation approval because it
changes persistence and Project Defense eligibility:

| Option | Behaviour                                                                                                                          | Recommendation                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A      | Partial imports live only in the editable client form; only a ready, confirmed project is saved.                                   | Safest minimal change; user can edit then confirm when ready.            |
| B      | User may save an explicitly confirmed `partial` project; it is editable but cannot enter Project Defense until it becomes `ready`. | Recommended if users need to retain incomplete projects across sessions. |

Neither option permits a partial or unconfirmed project to enter Project
Defense. If Option B is chosen, define explicit `partial` and `ready` state
transitions, ownership, migration/compatibility, and empty-state UX before any
model or API edit.

### R1-20 requirement and implementation matrix

| ID     | Required result                                             | Planned bounded work                                                                                                                                                                                                                                                            | Risk control and proof                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R20-01 | Identify project-relevant resume material without full RAG. | Preserve section/bullet structure in a bounded internal representation; rank `Projects`, `Experience`, `Academic`, `GitHub`, and project-action/technology cues; pass selected excerpts plus a bounded fallback excerpt to extraction.                                          | Deterministic, testable ranking; no embeddings, vector store, raw-text persistence, or provider call outside existing extraction. Fixtures prove early, late, and headingless project material remains reachable. |
| R20-02 | Project extraction accepts partial source evidence.         | Replace the extraction-only strict completed-project response contract with a distinct validated `partialProjectDraft` contract: supported fields may be empty, missing fields are explicit, source facts are copied/not inferred, and a plausible candidate is retained.       | Keep existing confirmed-project validator separate. Mock/provider fixtures prove sparse inputs yield drafts, fabricated fields are rejected, and malformed output never renders or persists.                      |
| R20-03 | Resume and README open one editable filled form directly.   | Normalize resume suggestions and README parser output into one client draft adapter; populate form immediately, label source and missing fields, retain manual values on failure/retry, and require explicit user action before save.                                           | No automatic save; component tests cover source switch, retry, manual preservation, empty/sparse draft, edit, discard, and confirmation.                                                                          |
| R20-04 | README describes and enforces its actual limits.            | Display `256 KiB` upload and `100,000` decoded-character limits before selection; retain UTF-8/type/binary/temporary-cleanup protections; map recognized content without treating unmatched text as fact.                                                                       | Parser/route/UI boundaries prove exact limit messages, safe rejection, cleanup, and no filename/raw content logging or persistence.                                                                               |
| R20-05 | Partial projects have safe durable behaviour.               | Implement only chosen Option A or Option B lifecycle. For B, add bounded state/validator/API/UI migration plan before editing; for A, preserve existing confirmed-project write contract unchanged.                                                                             | Ownership and transition tests; no partial project selectable for Project Defense; no migration without separately approved migration evidence.                                                                   |
| R20-06 | Project Defense remains truthful and useful.                | Keep immutable confirmed snapshot. Generate coverage only from nonempty ready facts; show an honest readiness blocker/action where no ready project exists.                                                                                                                     | Snapshot, coverage, and session tests prove raw imports never enter questions and missing categories do not yield fabricated challenges.                                                                          |
| R20-07 | Resolve only project-specific Gemini incompatibility.       | Run one separately approved synthetic profile probe that compares the working question profile with one project extraction variant at a time: minimal project JSON, then nested schema, then current output budget/context shape. Centralize only the proven compatible change. | One fixed synthetic request per approved row, no DB/UI/API route, no retry, safe category-only metadata, output discarded. Stop on nonconclusive or account/model/config result.                                  |
| R20-08 | Preserve existing working AI flows.                         | Keep Practice/simple question profile unchanged unless a shared change has direct evidence. Preserve safe `AI_PROVIDER_UNAVAILABLE`, one user-driven retry, finite deadlines, and no raw diagnostics.                                                                           | Focused extraction, Target, standard/adaptive question, V1/V2 evaluation, and safe-logging regressions.                                                                                                           |

### Provider probe sequence

Each row requires a separate explicit live-provider approval after its
predecessor result. Input is fixed synthetic project prose; output is discarded;
no API route, browser, database, persistence, retry, key/model/environment/SDK
change, or raw provider diagnostics are permitted.

| ID     | Profile                                                                                     | What it distinguishes                          | Stop/result rule                                                                  |
| ------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| P20-01 | Working question request profile with project-like synthetic prose and minimal JSON schema. | Whether content wording alone rejects.         | If rejected, stop: this exceeds project schema diagnosis.                         |
| P20-02 | P20-01 plus minimal partial-project object schema.                                          | Basic extraction JSON/schema compatibility.    | If rejected, adjust only proven central schema representation under new approval. |
| P20-03 | P20-02 plus current nested partial-project schema.                                          | Nested arrays/nullability/shape compatibility. | If rejected, simplify only outbound schema while local validator stays strict.    |
| P20-04 | P20-03 plus current extraction token/context budget.                                        | Output/input budget sensitivity.               | If rejected, tune only documented bounded budget/profile with new approval.       |

**R20-07 probe evidence:** P20-01 accepted. First P20-02 returned provider
`503`; the user approved one retry, which accepted. P20-03 and P20-04 then
accepted. Outputs were discarded. The configured model accepts project-like
synthetic prose, minimal and nested partial schemas, and current bounded
context/output profile. No code, configuration, model, key, SDK, API, data,
retry policy, or provider contract change is justified by this probe sequence.

**Corrective R20-07 evidence:** The production extraction request still returned
classified provider `4xx` rejection. Incremental synthetic probes accepted the
minimal schema, strict additional-properties schema, full unbounded draft
shape, and non-schema request configuration. The bounded full draft schema
rejected twice with `400`. The compatible extraction-only provider profile now
omits array cardinality keywords; local output validation remains unchanged and
strict. Focused extraction/provider/route tests passed `61/61`; one synthetic
configured-provider extraction smoke accepted. No response content, key, or
raw provider diagnostics were retained.

### R20-08 bounded transient retry — implementation plan

One hidden retry only for classified Gemini `503` in resume extraction, Job
Target analysis, Role Simulation generation, and Project Defense generation.
Two provider attempts maximum; preserve request identity and safe final error.
Never retry evaluation, quota, timeout, validation, malformed output, or other
provider failures. Focused deterministic `503`, replay, no-write, and
regression tests only; no live call.

**Approval request:** R20-08 retry boundary/tests/lint/format/delivery/diff
only. No provider probe, migration, browser, deployment, commit, or push.

**R20-08 evidence:** Enabled one retry for classified transient provider
unavailability in the four approved generation operations. Focused server tests
passed `85/85`; server lint, delivery validation, and diff check passed.

### R20-09 project-extraction invalid-output recovery

The user observed a first `INVALID_AI_RESPONSE` followed by successful manual
retry. The extraction operation may therefore retry one normalized
`provider_invalid_response` only after output validation fails, within the
existing finite timeout and with the same idempotency key. It remains read-only:
no draft is persisted before validation, and the client remains loading so the
suggestion button cannot create a competing request. Quota, timeout,
authentication, permission, model, provider rejection, unknown failures, and
all non-extraction malformed-output cases remain single-attempt.

**R20-09 evidence:** Deterministic invalid-first/valid-second extraction,
malformed-final-output exclusion, route contract, and client in-flight loading
lock passed: server `62/62`, client `11/11`. Server/client lint, formatting,
delivery validation, and diff check passed.

### R20-10 complete/partial project flow plan

The required user journey is: extract a source-supported draft; save either a
review-confirmed `partial` project or a fully confirmed `ready` project; show
both in the owned Projects list; reopen either for later editing; promote only a
complete confirmed project to `ready`; offer only `ready` projects to Project
Defense and reject every direct partial Defense attempt server-side.

| Requirement                    | Cause / bounded implementation                                                                                                                                                                                                                                                        | Safety and verification                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source body reaches extraction | Replace ranked individual-line excerpts with bounded contiguous heading/body blocks. Retain nearby body lines even when they lack a cue; rank blocks by heading/cue evidence and keep stable source order.                                                                            | No PDF parser change, raw-text response, provider prompt expansion, or `8,000` character-cap change. Fixtures cover recognised and unrecognised headings, uncued body text, late blocks, personal-data exclusion, and bounds. |
| Partial save and display       | Fix client `safeProject` partial branch to validate persisted partial fields directly, rather than adding response-only fields to `safePartialDraft`. Validate create/update partial responses with same parser. Display status-specific `Incomplete`/`Ready` labels and edit action. | Keep explicit review confirmation for both save actions. A missing confirmation deliberately performs no request. Test POST/PATCH, list/get/reload/edit, malformed response, and status presentation.                         |
| Later completion               | Keep existing complete write/update path as sole `partial` to `ready` promotion. The project stays editable if complete validation fails.                                                                                                                                             | Test partial remains partial after incomplete edit; complete confirmed update promotes; ownership and duplicate/state checks remain intact.                                                                                   |
| Project Defense                | Preserve client ready filter and service snapshot `ready` guard.                                                                                                                                                                                                                      | Test partial absent from selector and rejected by direct request; ready project remains selectable with immutable snapshot.                                                                                                   |

No migration is planned: existing records already have `ready` default or explicit
`partial` state. No provider call, browser run, deployment, commit, or push is
part of this planning scope.

**R20-10 evidence:** Focused server tests `29/29` and client tests `63/63`
passed. Proof covers uncued project-body retention, persisted partial
create/list/get/update parsing, status-specific display, legacy ready display,
and existing ready-only Project Defense selection/snapshot contracts.

### R20-11 multi-project bounded retrieval remediation plan

R20-10 corrected body retention by grouping a project section. That grouping can
place several unmarked project entries in one `1,000`-character excerpt, so a
late third entry can be cut before extraction. R20-11 replaces that single
section block with bounded entry/body chunks.

| Source shape                    | Required context result                                           | Selection rule                                                                           |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| One to five entries             | Every supported entry title/body remains independently reachable. | Retain source order after evidence score.                                                |
| Long entry before later entries | Later selected entries remain reachable.                          | Per-entry body cap; never spend all context on one entry.                                |
| More than five entries          | At most five entries reach existing provider output.              | Highest evidence first; source order breaks ties; user may add omitted project manually. |
| Sparse/headingless source       | Existing cue/fallback behavior remains.                           | No source-supported entry is invented.                                                   |

| Boundary                         | Planned change                                           | Preserved invariant                                                                             |
| -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Resume project context           | Entry/body chunking and deterministic bounded selection. | Existing ownership query, personal-line exclusion, `8,000` total cap, and no raw text response. |
| Gemini extraction                | No change.                                               | Existing five-draft schema, prompt, validation, retry, and error contract.                      |
| Project form/persistence/Defense | No change.                                               | Existing partial/ready lifecycle and ready-only Defense guard.                                  |

Verification: deterministic 1/2/3/5/6-entry fixtures; long-first-entry fairness;
recognised/unrecognised title and uncued body retention; privacy/cap/fallback and
source-order regressions. Focused server tests, server lint, formatting,
delivery validation, and diff check only. No live provider, browser, migration,
deployment, commit, or push.

### R20-12 complete-project validation recovery remediation plan

**Observed:** `PATCH /api/projects/:id` returns `400 VALIDATION_ERROR` although
form appears complete. Server returns a safe allow-listed `error.fields` map,
but `ProjectForm` renders only its generic message; no field is marked invalid.

**Evidence-ranked cause:** Screenshot values meet visible required scalar and
technology requirements. Responsibilities, architecture, and decisions are
entered as paragraph-sized single lines. The complete-project validator limits
each fact line to `300` characters, so any over-limit line rejects the entire
ready promotion. The exact failing key is intentionally excluded from logs and
currently discarded by the UI. This is the credible mechanism; it needs no
provider, resume, or database theory.

| Requirement           | Planned bounded work                                                                                                                                                        | Preserved contract                                                                              | Verification                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Safe error recovery   | Retain `ApiError.fields` in form state; render field-specific safe message, `aria-invalid`, and error association on every mapped control. Keep top-level recovery message. | Existing server validator/error shape remains source of truth; no raw request/provider/DB data. | Mock one/multiple server field errors; assert messages, accessibility state, focusable controls, and unchanged typed form. |
| Prevent opaque repeat | Add concise field help: one item per line; facts and claim sides `5–300` characters; completed summary `20–1000`; duplicates rejected.                                      | No client acceptance bypass or changed max/min/persistence rule.                                | Render/help and pre-submit/response regression cases.                                                                      |
| Ready availability    | Prove a successful strict update returns `ready` with `confirmedAt`, list reload accepts it, Practice shows it under Project Defense, and snapshot creation succeeds.       | `partial` stays unavailable in Practice and direct server snapshot remains `PROJECT_NOT_READY`. | Focused client save/list/Practice test and existing server ready/partial snapshot test.                                    |

**Scope:** Client error presentation and guidance; focused regressions across
existing ready lifecycle only. Do not change validator bounds, model, routes,
provider, extraction, migration, or Project Defense question generation unless
tests prove an existing ready-selection defect. No live Gemini, browser,
deployment, commit, or push.

**Reduced verification:** focused client form/API/Practice tests plus direct
server snapshot lifecycle test; affected client lint/format; delivery validation
and diff review. No repeated unrelated suite, provider call, or browser smoke.

**R20-12 evidence:** `ProjectsPage` retains an allow-listed field-error map,
marks affected controls with `aria-invalid`, associates the error text, and
clears only the edited field error. Help now exposes summary, per-line,
claim-side, and duplicate constraints. Focused client tests `53/53` prove error
recovery and explicit ready-versus-partial Practice selection; focused server
project-service/Project-Defense tests `11/11` prove snapshot eligibility.
Client lint, Prettier, delivery validation, and diff check pass. No server
project contract/provider/migration/browser change occurred.

### R20-13 project-fact `20–600` character-range update

User approved `20–600` characters for newly written responsibilities,
architecture facts, decisions, trade-offs, and claim text/evidence. Technologies
remain `1–50`; name/role/summary and all item-count, duplicate, confirmation,
ownership, ready-only Defense, and `16 KiB` aggregate limits remain unchanged.

This is compatibility-sensitive: existing `5–300` facts must still list, edit,
and support immutable historical Project Defense snapshots. Therefore readers,
models, and snapshots expand to `5–600`; only new complete/partial write
validators enforce `20–600`. Resume/README drafts retain sparse-source `5–600`
acceptance and must be edited before strict ready promotion when needed. No data
backfill is needed or authorized.

| Boundary                                 | New write policy                                        | Compatible read policy                          | Proof                                                  |
| ---------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Project requests/form                    | `20–600` for non-technology fact lines and claim sides. | N/A                                             | `19/601` reject; `20/600` accept; help text matches.   |
| Candidate projects and client API parser | Server writes enforce new range.                        | Existing and new values `5–600` parse/validate. | Legacy fixture and newly written `600` response parse. |
| Project Defense snapshot/session         | New ready project may contain `600`-character facts.    | Existing `5–300` snapshot remains valid.        | Focused ready Defense creation/snapshot test.          |
| Extraction/README draft                  | No provider/parser contract expansion.                  | Source-backed sparse facts remain `5–600`.      | Existing parser regression.                            |

**R20-13 evidence:** Complete and partial requests accept exact `20`/`600`
boundaries and reject `19`/`601`. Client response parsing retains legacy
five-character facts while accepting `600`-character facts. A ready project with
`600`-character architecture, responsibility, decision, trade-off, claim, and
evidence creates a stored Project Defense snapshot. Focused client tests
`66/66`, server tests `22/22`, both affected lints, Prettier, delivery
validation, and diff check pass. No provider/schema-output change, data rewrite,
browser, deployment, commit, or push occurred.

### R20-14 user-facing copy and project-source layout remediation plan

**Observed:** Audit found one rendered internal-version phrase: Skills says
`V2 practice session`. No rendered sample, demo, prototype, mock-data, or
implementation-start phrase was found in application source (tests excluded).
The Project source screenshot is a layout defect, not an import defect:
`.project-source-card` lays four children in one flex row while its labels claim
full width, forcing README help into an unreadable narrow column.

| Requirement               | Planned remediation                                                                                                                                | Explicitly preserved                                                                                                          | Proof after approval                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| No internal/demo language | Replace rendered `V2` and review visible mock-interview wording for plain practice language; retain useful instructions.                           | Internal identifiers, test fixtures, class names, API/error codes, provider prompts, and product behavior.                    | Focused source inventory and rendered-copy tests.                               |
| Human user guidance       | Rewrite only user-visible setup, saved-analysis, Coach, Tree, Planner, and result guidance in clear personal language with a concrete next action. | Evidence limits, privacy disclosures, fixed saved-context wording, no-hiring/no-readiness claims, errors, and state behavior. | Focused component/page assertions for copy and existing states.                 |
| Source-card alignment     | Group resume select/action separately from README label/help/file input; replace shrink-prone flex layout with responsive grid/stack rules.        | Select/file labels, accepted file types, limits, loading lock, retry, source reset, import review, and errors.                | Projects-page control/retry tests and static CSS responsive review.             |
| Accessibility/scope       | Keep native controls and existing error/status semantics while changing layout/copy.                                                               | `aria-invalid`, label association, keyboard behavior, and all client/server contracts.                                        | Focused client tests, client lint/format, delivery validation, whitespace diff. |

**Acceptance:** User sees no internal roadmap/version or demo/prototype language,
but still receives honest instructions. Coach and analysis text names what is
saved, what it can help practise, and a useful next action without promising a
hiring or readiness outcome. Resume and README inputs remain readable at the
same width as surrounding controls, including narrow screens. No browser smoke
is planned: it is not authorized and the supplied screenshot establishes the
layout failure; implementation proof is focused component plus static CSS review.

**Approval boundary:** client-only copy, `ProjectsPage` source-card markup,
`index.css`, focused client tests, documentation, client lint/format, delivery
validation, and diff check. No API/server/provider/browser/migration/dependency/
deployment/commit/push change.

**R20-14 evidence:** Replaced visible internal-version and mock-interview copy
with plain practice language. Setup, Target analysis, Coach, Tree, Planner, and
Skills guidance now names saved context/evidence, a practical next action, and
its outcome limit without changing behavior. Project source controls now render
as a responsive resume group plus a README group, with the README help directly
associated to its native file input. Focused client tests `93/93`, client lint,
and targeted Prettier check pass. Source inventory finds no rendered `V2
practice`, sample, demo, prototype, mock-data, implementation-start, or
mock-interview phrase outside tests. Server tests/browser smoke N/A: no server
code changed; browser automation remains unauthorized. No provider, API,
persistence, migration, dependency, deployment, commit, or push action occurred.

### DPL-01 Render environment parity

Render must provide the existing README-import production settings because
`README_IMPORT_UPLOAD_DIR` must be absolute in production. This update adds
`MAX_README_IMPORT_SIZE_BYTES=262144` and an isolated temporary directory to
the Render blueprint, then restores matching local server environment names.
No new environment contract is introduced: `server/.env.example` already lists
both settings; `client/.env` and `client/.env.example` already match their sole
public `VITE_API_BASE_URL` setting. No deploy, credential, provider/model,
route, API, migration, or client behavior change is authorized.

**DPL-01 evidence:** Render now supplies the README `262144` byte cap and
`/tmp/mockmateai/readme-imports`; local server configuration has matching
documented names. Both server and client local/example name-and-order checks
pass without reading values. Focused config tests `17/17` pass; server lint has
only its existing intentional README control-regex warning. No deployment,
credential display, provider call, browser, migration, commit, or push occurred.

#### R20-10 boundary matrix

| Boundary            | Current fault                                                                                    | Planned change                                                                                | Explicitly unchanged                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Resume intake       | Individual-line selection can drop a project body.                                               | Bounded block selection inside `toProjectResumeContext`.                                      | PDF extraction, stored source text, ownership lookup, API response, provider prompt, and `8,000`-character limit. |
| Extraction          | A missing source body yields a truthful empty summary.                                           | Give Gemini body evidence; keep source-substring output validation.                           | Provider model, schema, retry, cache, route, and save behavior.                                                   |
| Partial persistence | Server supports `partial`; client does not accept persisted partial response shape consistently. | Parse persisted `partial` separately; validate every partial create/update/list/get response. | Model fields, endpoints, ownership filters, confirmation rule, and migration.                                     |
| Project UI          | List visually calls every item confirmed; no clear partial continuation state.                   | Status badge, missing-facts cue, and Edit action for both statuses.                           | Manual editing, form field bounds, no automatic completion.                                                       |
| Promotion           | Complete confirmation is correct promotion boundary.                                             | Prove partial to ready through existing complete write only.                                  | No provider-written fact, no implicit status promotion.                                                           |
| Project Defense     | Ready filter/guard already own eligibility.                                                      | Prove after list/parser/UI repair.                                                            | Snapshot facts, question generation, provider behavior, and historical sessions.                                  |

#### R20-10 acceptance matrix

| Scenario                                                                      | Expected observable result                                                                   | Negative invariant                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Resume has recognised or unrecognised project heading followed by uncued body | Draft summary/facts may use source-supported body; user sees populated editable fields.      | No fabricated summary; bounds and personal-line exclusion hold.  |
| User confirms partial save                                                    | `POST /api/projects/partial` creates owned `partial`; list reload shows Incomplete and Edit. | No ready status, Defense eligibility, or automatic provider use. |
| User opens partial, edits, saves incomplete                                   | `PATCH /api/projects/:id/partial` retains `partial`, then list/get accept response.          | Failed validation/write does not change status or erase form.    |
| User completes all required facts and confirms complete save                  | Existing complete create/update returns `ready`; list shows Ready.                           | Incomplete facts cannot promote.                                 |
| User chooses Project Defense                                                  | Only ready projects are selectable and snapshot succeeds.                                    | Direct partial project request returns `PROJECT_NOT_READY`.      |

### Why this is not full RAG

This is one user's bounded resume/README intake, not a corpus search problem.
Vector RAG would add embedding calls, vector storage, indexing/deletion,
privacy/cost controls, and retrieval failure modes. It cannot repair rejected
Gemini requests, missing PDF text, unsupported source facts, or a strict
project lifecycle. Deterministic section-aware retrieval directly fixes the
known flattening and first-character-cutoff issue with less data retention and
fully testable behaviour. Reconsider RAG only if the product later supports a
large multi-document corpus and semantic cross-document retrieval is an
approved requirement.

### Execution order, verification, and estimate

1. Approve and run only P20-01, then the smallest next discriminating provider
   row if needed. Apply no speculative Gemini change.
2. Implement/test the shared partial-draft contract and deterministic resume
   section retrieval.
3. Implement/test direct editable resume/README form population and README
   limit messaging.
4. Implement only the selected lifecycle option, then prove Project Defense
   eligibility/snapshot boundaries.
5. Run focused server/client tests, affected lint/formatting, delivery
   validation, and diff review; reconcile tracker and this document.

| Verification category | Required evidence                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Success               | Early, late, sparse, and headingless fixtures produce truthful editable drafts.                                                                |
| Source integrity      | No field exists without source support or deliberate user edit; missing fields remain marked.                                                  |
| Failure/recovery      | Extraction rejection preserves selected resume, manual values, rendered drafts, and explicit same-key retry.                                   |
| Upload/privacy        | README size/type/UTF-8/binary/cleanup limits pass; raw source, filename, provider body, keys, and prompts remain absent from logs/API/storage. |
| Lifecycle             | Only user-confirmed ready projects enter Project Defense; snapshots remain immutable.                                                          |
| Regression            | Working Practice questions and existing manual/resume/README confirmation paths retain their contracts.                                        |
| N/A unless Option B   | Migration/database transition testing is required only if durable partial projects are approved.                                               |

**Estimated focused delivery:** `3–5` working days: provider isolation
(`0.5–1` day including separately approved probes), partial drafts/retrieval
(`1–2` days), form/lifecycle work (`1–1.5` days), and focused verification plus
documentation (`0.5–1` day). A provider/model/account/SDK decision, or Option
B durable partial persistence, can add a separately planned `0.5–1` day.

**Implementation approval boundary:** Approve only after choosing Option A or
Option B and reviewing a current-day traceability/verification matrix. Separate
approval remains required for every live Gemini probe. No browser, deployment,
commit, or push is included.

### R20-01 section-aware resume retrieval — implementation plan

**Status:** Implemented and verified locally. Option B belongs to later R20-05
lifecycle work; R20-01 changes no lifecycle, API, persistence, Project
Defense, provider request, prompt, schema, timeout, configuration, upload,
browser, deployment, commit, or push behaviour.

Current `toProjectResumeContext` flattens text then takes its first `8,000`
characters. R20-01 replaces only this project-extraction context construction.

| Requirement  | Plan                                                                                                                                                                     | Boundary/risk control                                                                                                                                                                   | Proof                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Reachability | Preserve lines/bullets/headings in ephemeral representation; rank `Projects`, `Experience`, `Academic`, `GitHub`, action, and technology cues; include bounded fallback. | Fixed heading/cue sets; stable source-order ties; final context `<= 8,000` characters. No embedding, vector store, new cache/storage, or external call.                                 | Passed locally — early, late, headingless, tie, fallback, and cap fixtures.    |
| Isolation    | Changed only `resumeService` project-context helper and focused tests.                                                                                                   | Existing owner/completed lookup, `projectService` idempotency, provider interface, route, response, client, generic `2,000`-character question context, and `Resume` storage unchanged. | Passed locally — ownership/unavailable, replay, provider-contract regressions. |
| Privacy      | Representation stays process-local.                                                                                                                                      | No source content or ranking data added to logs, responses, MongoDB, or cache.                                                                                                          | Passed locally — static boundary review plus focused assertions.               |

**Algorithm:** split normalized non-empty lines; label fixed recognized sections;
score fixed section/cue matches; select bounded ranked excerpts then one
source-order fallback; preserve existing `8,000`-character validation ceiling.

| Verification       | Required evidence                                                                                                             | Status                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Success/validation | Early/late/headingless reachability; stable ties; bounded fallback and cap cases safe.                                        | Passed locally                                                                                    |
| Ownership/state    | Foreign, missing, failed resume rejects before provider; same-key replay/conflict unchanged; no mutable retrieval state.      | Passed locally                                                                                    |
| Recovery/privacy   | Existing failed-attempt cleanup and user retry remain; no representation reaches logs/response/storage.                       | Passed locally                                                                                    |
| N/A                | Provider failure, migration, persistence, API/client, lifecycle, and Project Defense: unchanged boundaries.                   | N/A                                                                                               |
| Regression/docs    | Existing project provider/unit/integration tests; server lint, Prettier, delivery validation, diff check; reconciled records. | Passed locally — 22 focused tests passed before final lint-only edit; final 11 unit tests passed. |

**Focused implementation approval requested:** Approve R20-01 only: narrow
server retrieval-helper/test edits, focused deterministic server tests, server
lint, documentation formatting, delivery validation, and diff checks. No
dependency, migration, provider/Gemini call, browser, upload, deployment,
commit, or push action. Stop for approval if a route/API/provider/prompt/schema
or persistence change becomes necessary.

**R20-01 execution evidence:** `resumeService` now retains bounded candidate
lines from fixed project-relevant sections/cues, uses stable source-order ties,
and adds a bounded fallback without changing generic resume context. Focused
server tests passed `22/22`; after the final no-behaviour lint correction,
focused unit tests passed `11/11`. A repeat integration invocation could not
bind `mongodb-memory-server` under sandbox (`listen EPERM`); no application
process was started or left running. Server lint passed with the pre-existing
README control-regex warning only; Prettier, delivery validation, and diff
checks passed.

### R20-02 partial-project extraction contract — implementation plan

**Status:** Implemented with approved R20-03 client compatibility. This work
changes no `CandidateProject` model/write validator, durable partial lifecycle,
Project Defense eligibility, route, retry/timeout, provider configuration, or
live-provider behaviour. Option B persistence begins only at R20-05.

| Requirement          | Plan                                                                                                                                                                                                                                  | Boundary/risk control                                                                                                                                                                                              | Proof                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Partial draft        | Add a distinct internal `partialProjectDraft` validator. Scalars are supported bounded text or `null`; lists are bounded arrays; `missingFields` exactly identifies every empty field. Require one plausible source-backed candidate. | Keep `validateProjectFacts`, `CandidateProject`, and confirmed write contract strict and separate. Reject extra keys, malformed/null-inconsistent fields, duplicate lists, oversized output, and all-empty drafts. | Sparse valid, malformed, fabricated, empty, duplicate, and over-bound fixtures.        |
| Source integrity     | Validate each nonempty normalized field/list value against bounded selected resume context before it reaches client/cache. Claims require source-backed text and evidence when present.                                               | Provider may propose only copied source facts. No inferred metric, role, architecture, decision, trade-off, or claim persists/renders.                                                                             | Fixtures prove source-supported partial retained; transformed/invented value rejected. |
| Provider isolation   | Wire mock and Gemini adapters to new local output contract only. A future P20-02 probe separately tests configured Gemini acceptance; no live request occurs here.                                                                    | Keep existing request limit, safe error mapping, single-attempt/idempotency, and existing extraction route/response envelope.                                                                                      | Captured mock request/output shape; safe provider-rejection regression.                |
| Downstream isolation | Keep partial drafts transient and return them only through existing extraction flow. R20-03 normalizes review form; R20-05 owns durable partial writes; R20-06 owns readiness/Defense.                                                | No Mongo write, migration, route change, raw source return, cache expansion, or Defense snapshot change.                                                                                                           | Existing confirmed create/update/Defense regressions.                                  |

**Contract:** provider output is `{drafts}`. Each draft contains all project
fact keys with `null`/`[]` for absent values plus bounded `missingFields`. The
service adds existing `source` and `sourceResumeId`. Values must be normalized
source substrings; no field may be synthesized. A candidate is plausible only
when at least one source-backed identity/summary or technical/action fact
exists. `missingFields` must equal absent fields, not provider choice.

| Verification             | Required evidence                                                                                                                                                                                      | Status                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Success/validation       | Sparse candidate survives with explicit missing fields; full valid candidate remains valid; malformed, extra, empty, duplicate, over-bound, and mismatched-missing outputs reject before render/cache. | Pending                              |
| Integrity/privacy        | Every nonempty value is source-backed; raw resume/provider body stays out of response/log/storage; failed extraction writes nothing.                                                                   | Pending                              |
| Ownership/state/recovery | Existing owned completed-resume gate, same-key replay/conflict, safe failure, manual preservation, and user retry unchanged.                                                                           | Pending regression                   |
| N/A                      | Migration, durable partial write, client form, Project Defense, live Gemini probe, API contract, configuration, timeout, and retry changes belong outside R20-02.                                      | N/A                                  |
| Regression/docs          | Mock/provider/service/route confirmed-project tests, server lint, Prettier, delivery validation, and diff check.                                                                                       | Passed locally — server units 55/55. |

**Focused implementation approval requested:** Approve R20-02 only: server
partial-draft validator/provider-service/mock and Gemini adapter contract
edits, focused deterministic tests, server lint, documentation formatting,
delivery validation, and diff checks. No live Gemini call, browser, upload,
migration, persistence, client/API contract, deployment, commit, or push.
Stop for approval if a durable write, public contract change, or provider probe
becomes necessary.

**Resolved stop gate:** `client/src/api/projectApi.js` previously validated every resume
suggestion as a complete confirmed-project-shaped draft and rejects both
`null` fields and `missingFields`. Activating the R20-02 partial contract in
the existing extraction response would therefore turn a valid sparse server
result into the current client safe-response error. R20-03 client parsing/form
normalization is a direct required dependency, not optional follow-on work.
Do not activate the partial response contract until the user explicitly
approves a combined R20-02/R20-03 boundary or directs a different staging
approach. The approved combined scope adds an exact bounded partial parser and
review card/form mapping; incomplete facts remain unsaveable under the existing
strict confirmed-project write contract. No live Gemini request, persistence,
migration, browser, deployment, commit, or push occurred.

### R20-03 partial-draft client compatibility — implementation plan

**Status:** Implemented and verified locally with R20-02. This activates only transient review of
source-backed partial drafts. It does not permit save until existing complete
fact validation and explicit confirmation pass.

| Requirement | Plan                                                                                                                                                                              | Boundary/risk control                                                                                              | Proof                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Parse       | Add a separate bounded resume-partial parser: nullable scalar facts, empty lists, exact `missingFields`, fixed source fields. Keep confirmed-project parser/write payload strict. | Reject unknown, duplicate, over-bound, inconsistent, or all-empty drafts before render.                            | API unit partial/full/invalid fixtures.                                                                     |
| Review      | Map `null` to empty form values; retain arrays; display source and missing fields on draft card. Review action fills only supported facts and clears confirmation.                | No automatic save; native required fields and existing strict payload still block incomplete save.                 | Page test selects sparse draft, shows missing facts, preserves manual edits/retry, sends no create request. |
| Isolation   | Change `projectApi` and `ProjectsPage` only.                                                                                                                                      | No model, server route, cache/retry, provider, resume, README, lifecycle, Defense, browser, or persistence change. | Existing complete-draft extraction/save regression.                                                         |

| Verification       | Required evidence                                                                                                   | Status                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Success/validation | Partial response accepts only exact bounded shape; review renders honest missing list; complete draft path remains. | Passed locally                          |
| Recovery/security  | Existing error/retry/manual preservation unchanged; no raw resume/provider payload displayed.                       | Passed locally                          |
| N/A                | Authentication/ownership, provider, persistence, migration, Defense, upload, browser: unchanged.                    | N/A                                     |
| Regression/docs    | Focused API/page tests, affected lint, Prettier, delivery validation, diff check.                                   | Passed locally — client API/page 20/20. |

**R20-02/R20-03 execution evidence:** Server output validation now accepts only
bounded source-backed partial drafts with exact missing-field projection. Mock
and Gemini adapter contracts use the same shape; no configured provider call
was made. Client parser accepts only that bounded transient shape; review cards
name missing facts, and the existing strict confirmed-project form/save path
still requires completion and explicit confirmation. Server units passed
`55/55`; client API/page tests passed `20/20`; both lints, Prettier, delivery
validation, and diff checks passed. The pre-existing README control-regex lint
warning remains. No route integration rerun: route/controller/persistence code
is unchanged, and the earlier sandbox Mongo bind restriction remains recorded.

### R20-04 README limit disclosure and parser truthfulness — implementation plan

**Status:** Implemented and verified locally. Current server enforcement caps
one allowed UTF-8 upload at `256 KiB` and decoded text at `100,000` characters.
The client now states both limits before file selection.

| Requirement            | Planned bounded work                                                                                                                                                        | Boundary/risk control                                                                                                                           | Proof                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Limit disclosure       | Before the file input, state Markdown/text only, one file, `256 KiB` upload maximum, and `100,000` decoded-character maximum.                                               | Copy is advisory; client/server validators remain authoritative. No source content, filename, or configuration value is displayed.              | Passed locally — focused page assertion verifies all four facts render before selection.                       |
| Upload enforcement     | Preserve existing extension/MIME, one-file, `256 KiB`, UTF-8, binary/control-character, blank-file, rate/auth, randomized temporary-file, and `finally` cleanup boundaries. | No upload middleware, environment default, route, parser limit, provider, persistence, or model change unless evidence reveals a contradiction. | Reuse existing focused service/route evidence; run a focused server negative test only if server code changes. |
| Parser truthfulness    | Preserve recognized headings as the only draft facts; retain unmatched text solely as bounded review context with omission count.                                           | Never promote unmatched prose to a fact; no automatic save or Project Defense eligibility change.                                               | Existing parser fixtures plus a focused assertion if parser code changes.                                      |
| Recovery/accessibility | Preserve current safe client preflight, error, retry, manual-entry, and explicit confirmation paths.                                                                        | Copy must not weaken validation or replace safe server errors.                                                                                  | Focused page import/error/retry regression.                                                                    |

| Verification category | Required evidence                                                                                      | Status                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Success               | Limits are visible before selection; valid README flow remains available.                              | Passed locally                            |
| Validation/privacy    | Existing server guards, safe errors, no raw content logging/persistence, and cleanup remain unchanged. | Existing boundary; no server edit planned |
| Recovery/regression   | Invalid selection/error/retry/manual path remains unchanged.                                           | Passed locally — focused page test        |
| N/A                   | Provider, Gemini, persistence, migration, lifecycle, Defense, browser, deployment, commit, and push.   | N/A                                       |
| Documentation         | Targeted Prettier, delivery validation, and diff check after plan update.                              | Passed locally                            |

**R20-04 execution evidence:** Added only static pre-selection copy in
`ProjectsPage` and one focused render assertion. Server limit/parser/upload
boundaries were not changed. Focused page tests passed `10/10`; client lint
passed. Prettier, delivery validation, and diff checks passed. No
provider/Gemini call, browser, server, persistence/migration, deployment,
commit, or push occurred.

### R20-05 durable partial-project lifecycle — implementation plan

**Status:** Complete — approved implementation and migration execution passed.
A user-confirmed `partial` project persists across sessions and is editable;
only `ready` may create a Project Defense snapshot.

| Requirement | Planned bounded work                                                                                                                                                                                                                                                         | Boundary/risk control                                                                                                                      | Proof                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| State       | Add server-owned `partial` and `ready` states. Imports remain unpersisted until an explicit user action. `partial` requires one bounded plausible fact and explicit partial confirmation; `ready` requires the unchanged complete-facts validator and explicit confirmation. | Client cannot assert `ready`. Server derives state from dedicated write intent plus validation. No source text/provider payload is stored. | Validator/service state-transition fixtures.                                    |
| Edit        | Add explicit partial create/update actions; allow `partial` to remain partial, promote it to `ready` only through strict existing-ready validation, and allow a deliberate ready-to-partial downgrade before removing required facts.                                        | Existing ready create/update payload and behavior remain compatible. Every mutation remains owner-scoped; no auto-save.                    | Route/service owner, invalid transition, and stale/duplicate action tests.      |
| Data        | Add `status`, server-written `partialConfirmedAt`, and nullable/empty partial fact representation while retaining existing ready facts, `confirmedAt`, source-resume ownership, bounds, uniqueness, and `16 KiB` cap.                                                        | Existing records are legacy-ready only when they satisfy current strict schema. Existing data is never rewritten as partial.               | Model/serialization and migration preflight tests.                              |
| Migration   | Ship compatibility read before a separately approved idempotent backfill: legacy missing `status` reads as `ready`; dry-run counts only missing-status records; backfill sets only `status: "ready"`; verify count and fact-byte equality.                                   | No startup mutation, no destructive operation, no raw data logging, no downgrade, and stop on malformed legacy record or count mismatch.   | Dry-run/apply/re-run migration fixtures and post-check report with safe counts. |
| Defense     | `getConfirmedProjectSnapshot` rejects every non-`ready` record with `PROJECT_NOT_READY`; Practice lists/selects ready projects only and labels partial projects with completion action. Existing snapshots remain immutable.                                                 | API/service guard remains authoritative; no partial fact reaches provider, question, session snapshot, or Project Defense UI selection.    | Unit, route, and client selector tests.                                         |

**State transitions:** `unpersisted -> partial` requires explicit partial
confirmation; `partial -> partial` requires explicit partial confirmation;
`partial -> ready` and `ready -> ready` require the existing complete-facts
confirmation; `ready -> partial` requires explicit downgrade confirmation;
either persisted state may be owner-deleted. `partial -> Project Defense` is
always rejected. Past ready Project Defense snapshots stay unchanged after any
later project edit, downgrade, or deletion.

**Compatibility contract:** Partial requests use all project fact keys with
`null` scalar/`[]` list missing values; server derives `missingFields` in the
response. A partial may contain user-entered facts after review, so source
backing remains mandatory only for extraction output, not a later user edit.
Ready endpoints retain their existing strict request/response shape except an
additive `status: "ready"` response field. Partial responses add `status:
"partial"`, `partialConfirmedAt`, and derived `missingFields`; they never
contain raw resume/README content.

| Verification category | Required evidence                                                                                                                          | Status                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Success/state         | Create, reload, edit, downgrade, promote, list, and delete owned partial projects; ready behavior remains intact.                          | Planned                                       |
| Validation/security   | Reject empty, malformed, oversized, duplicate, unauthorized, forged-ready, invalid-ID, and invalid-transition requests.                    | Planned                                       |
| Migration             | Legacy reads remain ready before backfill; dry run, apply, and rerun are idempotent and alter only missing `status`.                       | Planned; separate migration approval required |
| Defense/recovery      | Partial selection and direct API start return safe `PROJECT_NOT_READY`; edits/failures preserve form; existing snapshots remain immutable. | Planned                                       |
| N/A                   | Provider/Gemini, resume/README upload/parser, browser, deployment, commit, and push.                                                       | N/A                                           |

**Focused implementation approval request:** Approve R20-05 only after
reviewing the final migration script/plan: model/validator/service/controller/
route/client contract and UI changes, focused unit/route/component tests,
affected lint/formatting, one approved migration dry run plus apply only when
its preflight passes, delivery validation, and diff check. No provider/Gemini
call, browser, deployment, commit, or push. Stop for renewed approval on a
legacy-data anomaly, migration count mismatch, schema/index change beyond this
plan, or any need to alter historical session snapshots.

### R20-06 truthful Project Defense readiness and coverage — implementation plan

**Status:** Complete — verified locally. Only an owned `ready` project may supply the immutable
facts snapshot. Coverage exists only for nonempty saved fact categories; no
missing category may produce a question, challenge anchor, or readiness claim.

| Requirement | Planned bounded work                                                                                                                            | Risk control                                                                               | Proof                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Readiness   | Preserve service-authoritative `PROJECT_NOT_READY` for partial/missing/invalid projects; show a completion action when no ready project exists. | No client bypass; no raw import or partial fact reaches session/provider.                  | Service, route, Practice empty/partial selector tests.             |
| Snapshot    | Retain ready facts-only immutable snapshot and `16 KiB` bound. Later edit/downgrade/delete never changes an existing session.                   | Exclude resume/source/provider data and timestamps except existing safe snapshot metadata. | Snapshot/replay regression.                                        |
| Coverage    | Derive fixed six categories only where facts are nonempty; opening/follow-up selects only returned coverage and bounded anchors.                | No fabricated category/challenge; absent facts remain omitted rather than inferred.        | Sparse ready-project category matrix and adaptive follow-up tests. |
| UX          | Explain ready-project requirement and list only ready projects; partial state links to completion/edit.                                         | Honest blocker, no hiring/readiness claim, existing text flow unchanged.                   | Focused Practice component tests.                                  |

| Verification      | Required evidence                                                                                         | Status         |
| ----------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| Success           | Ready sparse project starts with available factual coverage; full project retains six-category behavior.  | Passed locally |
| Negative/security | Partial, foreign, invalid, absent, malformed, or oversized project cannot start Defense or call provider. | Passed locally |
| Recovery/replay   | Safe error/retry preserves setup; saved session snapshot/replay remains unchanged after project mutation. | Passed locally |
| N/A               | Migration, provider/Gemini configuration, upload/parser, browser, deployment, commit, push.               | N/A            |

**R20-06 execution evidence:** Existing ready-only snapshot guard, nonempty
coverage filter, bounded challenge anchors, and ready-only Practice selector
meet this scope without further executable edits. Client tests passed `50/50`;
server tests passed `20/20`; both lints, delivery validation, and diff check
passed. Existing README control-regex lint warning remains. No migration,
provider/Gemini call, upload, browser, deployment, commit, or push occurred.

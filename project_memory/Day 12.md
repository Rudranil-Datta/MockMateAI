# V2 Day 12 — Workspace, Onboarding, Dashboard, and Guided Setup

## Approval boundary

Planning only. No Day 12 source, dependency, API, persistence, provider,
migration, deployment, browser, commit, or push work is approved by this file.

Day 12 is client-led. It may consume existing owned Job Target, Candidate
Project, skill-profile, analytics, resume, and interview-start contracts. It
must not change their server shape, create data, or reinterpret evidence. Day
13 exclusively owns active interview cockpit and in-place feedback redesign;
Day 11 exclusively owns replay/result timeline and retest comparison.

## Traceability matrix

| ID      | Required outcome / source                                                                                                                                                        | Boundaries                                                                           | Risk control                                                                                                                                                | Planned implementation evidence                                                                                  | Independent verification                                                                                                         | Status  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| D12-R01 | Desktop adaptive rail and mobile accessible drawer expose Dashboard, Practice, Targets, Projects, Skills, Resumes, profile, and logout. `Day 11 - 13 UI.md`; V2 timeline Day 12. | `AppShell`, routes, existing auth/logout, responsive CSS.                            | Preserve every existing route; keyboard drawer, focus return, semantic current-page state; no navigation framework/dependency.                              | Existing shell becomes adaptive rail/drawer; add only `/targets` and `/skills` client routes.                    | Focused shell/router tests: desktop links, drawer open/close, keyboard/focus, mobile route reachability, logout.                 | Pending |
| D12-R02 | First-use Preparation setup shows owned-resource progression: add Job Target, confirm Project, practise, review. `Day 11 - 13 UI.md`; success criteria UI.                       | Dashboard reads of existing targets, projects, skills, analytics; links only.        | Derive state from validated owned API responses; no progress scoring, gamification, or fabricated readiness.                                                | Reusable setup panel maps safe existing resource states to one next step and route.                              | Empty/partial/populated/loading/error/retry client cases; foreign/private fields rejected at API boundary.                       | Pending |
| D12-R03 | Dashboard has readiness hero with exactly one recommended action, confidence-labelled skills/trend context, and recent-session replay access. UI plan; V2 plan §5.               | `DashboardPage`, analytics/profile client wrappers, result links.                    | One server-derived action only; confidence wording; no hiring claim, hidden reasoning, raw evidence, or invented trend.                                     | Recompose existing dashboard around validated analytics and safe profile fields.                                 | Success/empty/pending/error/retry, one-action assertion, safe profile rejection, replay-link regression.                         | Pending |
| D12-R04 | `/targets` workspace manages existing owned Job Targets with usable loading, empty, validation, save, error/retry, and preserved draft states. UI plan; V2 plan §1/§5.           | New client page/route using existing `jobTargetApi`; no server edits.                | Client validates before request; preserve entered draft on failed analysis/save; never expose JD/provider payload beyond existing safe fields.              | Reuse API wrapper and UI primitives; list/create/edit/delete only where already supported.                       | Focused page/API tests for loading, empty, validation, failure/retry, preserved draft, and safe response shape.                  | Pending |
| D12-R05 | `/skills` workspace shows mastery, confidence, evidence count, last-practised date, and focused-practice entry. UI plan; Day 9 profile contract.                                 | New client page/route using `GET /api/skills/profile`; handoff to Practice.          | Render only validated safe profile fields; pending is explicit; targeted focus comes from server-derived key, never client mastery.                         | Reuse `recommendedAction`/skill fields and route state/query; no evidence write/read expansion.                  | Populated/empty/pending/error/retry/profile-malformation tests; handoff calls existing Day 10 fields only.                       | Pending |
| D12-R06 | Guided Practice setup supports type, level, optional resume, conditional Target/Project, and server-derived targeted-practice focus. UI plan; Day 10 contract.                   | `PracticePage`, interview API wrapper, existing target/project/resume/profile reads. | Preserve drafts through load/start failure; enforce conditional context UI; only add existing `sessionPurpose` and `focusSkillKey` to client start payload. | Incrementally reshape existing setup; do not alter five-question lifecycle, provider call, or server validation. | Type/context switch, target/project loading/error/retry, focused handoff, start failure draft preservation, V1 regression tests. | Pending |
| D12-R07 | Workspace baseline remains accessible and responsive. UI plan; success criteria UI.                                                                                              | Day 12 client components/CSS only.                                                   | Semantic landmarks/headings, labelled controls/live status, visible focus, text-not-color, 320px reflow, reduced motion; no browser smoke.                  | Reuse existing focus/reduced-motion primitives; add scoped responsive styles.                                    | Focused component accessibility assertions and stylesheet review.                                                                | Pending |
| D12-R08 | Contracts/tracker truthfully distinguish client composition from server contract changes. Delivery Assurance.                                                                    | API/data-flow/status/design docs.                                                    | Document no invented endpoint/write; record exclusions, verification, findings, and Day 13 boundary.                                                        | Update only affected docs after final behavior is known.                                                         | Documentation validation, scoped format/diff review.                                                                             | Pending |

## Verification matrix

| Category                    | Planned evidence                                                                                                          | Status                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Success                     | Rail, setup guidance, dashboard, Targets, Skills, and guided setup render from validated owned responses.                 | Pending                                  |
| Validation                  | Malformed analytics/profile/target/project data and invalid setup selections fail safely before render/start.             | Pending                                  |
| Authentication/ownership    | Existing protected routes and client wrappers retain safe foreign/missing behavior; no client-supplied ownership/mastery. | Pending                                  |
| State/concurrency           | N/A for new mutations; existing Job Target/Project/start idempotency stays server-owned.                                  | N/A — no server lifecycle change planned |
| Dependency/provider failure | N/A — no provider or dependency boundary change planned.                                                                  | N/A                                      |
| Persistence failure         | Target draft and Practice selections survive existing failed save/start paths.                                            | Pending                                  |
| Recovery/retry              | Each new read surface has loading, empty, error, and retry state; no false readiness.                                     | Pending                                  |
| Privacy/security            | No raw evidence, JD, resume text, provider payload, source ID, or hiring inference renders.                               | Pending                                  |
| Regression                  | Existing dashboard, Projects, Resumes, V1 Practice, Role Simulation, Project Defense, and result routes remain reachable. | Pending                                  |
| Accessibility               | Keyboard drawer, focus order/return, semantic labels/live status, visible focus, 320px/reduced-motion stylesheet review.  | Pending                                  |
| Documentation               | API/data-flow/status records match final client-only scope.                                                               | Pending                                  |

## Risk and gap-remediation matrix

| ID     | Severity | Gap / risk                                                                       | Required control and proof                                                                                             | Status               |
| ------ | -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------- |
| G12-01 | P1       | New rail hides or strands an existing route on mobile.                           | Route inventory plus keyboard drawer/focus-return tests; preserve all existing links.                                  | Open                 |
| G12-02 | P1       | Dashboard invents readiness, mastery certainty, or hiring signal.                | Exactly one existing server-derived action; confidence-labelled safe fields only; negative rendering tests.            | Open                 |
| G12-03 | P1       | Targeted-practice UI trusts client mastery or changes Day 10 lifecycle.          | Handoff carries only server-derived `focusSkillKey` and `sessionPurpose`; existing start validation remains authority. | Open                 |
| G12-04 | P1       | Target/Project/Practice draft is lost on read, analysis, save, or start failure. | Local drafts preserved; retry controls; failure-state tests.                                                           | Open                 |
| G12-05 | P1       | New workspace renders raw/private source/provider data.                          | Exact client response validation and privacy assertions.                                                               | Open                 |
| G12-06 | P2       | Dense dashboard or visual-only status harms keyboard/mobile use.                 | Clear hierarchy, semantic controls, text labels, focus/reflow/reduced-motion review.                                   | Open                 |
| G12-07 | P1       | Day 12 pulls in Day 13 cockpit/replay work, server changes, or dependencies.     | Diff review against boundaries; stop for any such need.                                                                | Open                 |
| G12-08 | P1       | Matrices duplicate ownership across Days 11–13.                                  | Day 11 owns result/replay; Day 12 owns navigation/workspaces/setup/dashboard; Day 13 owns active cockpit/feedback.     | Resolved in planning |

## Planned tasks and stop gates

| Task   | Objective / area                                                      | Dependencies                                      | Stop gate                                                                                    |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| T12-01 | Confirm current shell/routes and introduce adaptive navigation.       | Existing `AppShell`, auth, CSS.                   | Any new package, missing safe mobile focus strategy, or route regression.                    |
| T12-02 | Build Targets and Skills surfaces from existing safe client APIs.     | Existing wrappers/contracts.                      | Required server/API shape change, write contract gap, or private field exposure.             |
| T12-03 | Add owned-resource preparation guidance and recomposed dashboard.     | Validated target/project/profile/analytics reads. | Missing safe single recommendation source or invented readiness signal.                      |
| T12-04 | Upgrade Practice setup and Day 10 handoff without changing lifecycle. | Existing start API/validators.                    | Server change, provider call, draft-loss regression, or targeted-practice contract mismatch. |
| T12-05 | Apply Day 12 accessibility/recovery states and focused verification.  | T12-01 through T12-04.                            | Unresolved P0/P1, failed V1 setup regression, or browser/dependency need.                    |
| T12-06 | Reconcile docs and complete review.                                   | Passing focused evidence.                         | Documentation conflict or scope deviation.                                                   |

## Test scope and completion gate

- Focused client page, API-wrapper, shell/router, and Practice setup tests.
- Server tests/lint only if final approved implementation changes server code; none planned.
- Client lint/build, documentation validation, and scoped diff check.
- No full workspace suite, Atlas run, provider call, dependency installation,
  migration, deployment, or browser automation. Browser smoke remains Day 13
  only after separate approval and BrowserAct activation.
- Complete only when every D12 row passes, affected V1/V2 UI paths remain
  usable, docs agree, and no unresolved P0/P1 remains.

## Approval request

Approve Day 12 implementation only if this exact client-led scope, reduced test
scope, and stop gates are acceptable. Approval does not authorize Day 13.

# V2 Extension Upgrade Assurance

## Authority and use

`V2_EXTENSION.md` is scope authority for E1–E6. This document stores
extension matrices, audits, remediation, and preventive checks. `IMPLEMENTATION_STATUS.md`
stores only current status, approval scope, outcome, evidence summary, blockers,
and manual tasks.

Create an E2–E6 matrix only after the user explicitly requests that extension.
No matrix authorizes implementation; each requested extension still requires
explicit approval before edits.

## Preventive completion gate for E1–E6

| Check | Required evidence before `Complete` |
| --- | --- |
| Source mapping | Every source phrase maps to a requirement, implementation location, and verification. |
| Delivered semantics | Tokens/primitives are declared, consumed by intended UI, and retain text/icon labels. |
| Exact interaction | Motion duration, focus, reduced-motion, hover, and pressed behavior match source wording. |
| Runtime claim | Mark visual/reflow/zoom claims `Unverified` unless direct focused runtime evidence exists. |
| Final audit | Review final diff against each requirement before status update; tests, lint, and build do not replace missing behavior. |
| Scope | Record no added API, persistence, provider, package, migration, or deployment work unless separately approved. |

## Historical E1 audit and remediation

**Status:** Superseded by the Midnight Prism E1 revision below. It records only
the earlier limited palette remediation; it is not completion evidence for the
current E1 scope.

| ID | Requirement and audit finding | Remediation | Evidence / status |
| --- | --- | --- | --- |
| E1-A01 | Tokens existed but teal/violet semantics and reusable chips were not consumed. | Added type/surface tokens, shared `semantic-chip` variants; migrated saved-question and resume states; applied violet preparation surface. | CSS and changed-page review; focused page tests. Passed. |
| E1-A02 | Card lift, pressed controls, and 160–220ms route reveal were absent/inexact. | Added 200ms hover card lift, pressed button/icon state, and 200ms section reveal; existing reduced-motion override disables nonessential movement. | CSS review; lint/build. Passed. |
| E1-A03 | Main rail width and available-width reflow needed retained proof. | Kept `calc(100% - 240px)`, `min-width: 0`, and app-content container reflow. No overflow-hiding rule added. | Source review and scoped diff. Passed. |
| E1-A04 | Browser viewport proof was not authorized under reduced scope. | Do not state browser-measured overflow, 320px, or 200% zoom results. | Explicitly unverified; no completion blocker for CSS-only E1. |

## E1 — Midnight Prism approval matrix

**Status:** Complete — approved client presentation work passed focused source
checks and user-rendered acceptance. Source authority:
`V2_EXTENSION.md` E1 and shared visual direction. Scope is client presentation
only; no API, persistence, provider, package, migration, environment,
deployment, commit, or push work.

### Traceability and verification

| ID | Required behavior and boundaries | Risk / prevention | Independent evidence | Status |
| --- | --- | --- | --- | --- |
| E1-MP01 | Replace white-first shared and current client surfaces with consumed Midnight Prism canvas, shell, surface, text, border, cobalt, violet, teal, amber, and coral tokens. Applies shell, cards, controls, alerts, chips, Dashboard, Practice, Targets, Projects, Skills, Resumes, and shared result primitives. | Declared-but-unused tokens or colour-only states. Migrate equivalent literals; retain text/icon labels and contrast-safe focus. | Direct audit remediated Practice level cards plus shared session, profile, transcript, feedback, and public surface foregrounds; user-rendered acceptance recorded. | Passed |
| E1-MP02 | Establish professional elevation/type hierarchy without changing page content, route behavior, or lifecycle. | Visual scope leaks into E2 composition. Restrict work to existing markup and shared/current styles. | Shared elevation/type overrides implemented; user-rendered acceptance recorded. | Passed |
| E1-MP03 | Add bounded CSS-first motion: 120ms press, 160–200ms interaction, 240ms section entry, 400ms chart/progress; six-card entry cap; no decorative infinite loops. | Motion distracts, misstates progress, or violates reduced motion. Animate presentation only; reduced-motion disables nonessential transforms/reveals/shimmer. | CSS motion implementation and reduced-motion rules reviewed; user-rendered acceptance recorded. | Passed |
| E1-MP04 | Preserve responsive rail, drawer, grid reflow, 44px changed controls, keyboard focus, 320px, 200% zoom, and no horizontal page scroll. | Visual migration reintroduces clipping/overflow. Keep intrinsic sizing and container reflow; never hide page overflow. | User verified rendered E1 acceptance after remediation; isolated BrowserAct remained unauthenticated and was not used as evidence. | Passed |
| E1-MP05 | Preserve V1/V2 journeys; make no non-client, data, provider, dependency, or contract change. | Style edits break current controls or broaden scope. Limit source changes to client presentation; test only changed component behavior. | Client lint/build, delivery validation, and scoped diff pass. | Passed |

### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E1-MP-G01 | P1 | Token migration leaves old white/blue literal application surfaces or an inaccessible contrast pair. | Inventory and replace affected literals with semantic tokens; review labels, focus, and contrast before completion. | Resolved by direct selector audit and user-rendered acceptance |
| E1-MP-G02 | P1 | Motion is missing, exceeds bounds, loops decoratively, or remains under reduced motion. | Central motion tokens, CSS-only keyframes, no behavioral state, reduced-motion browser check. | Resolved by source review and user acceptance |
| E1-MP-G03 | P1 | Palette/elevation changes obscure loading, error, retry, draft, text, or voice state. | Verify current state labels and focused route regressions; stop on lifecycle change. | Resolved by focused checks and user acceptance |
| E1-MP-G04 | P1 | Desktop rail or responsive content horizontally scrolls or clips. | Required focused browser smoke; fix constraints rather than hide overflow. | Resolved by user-rendered acceptance; BrowserAct state recorded as unavailable |
| E1-MP-T01 | — | Update semantic design/motion tokens and shared primitives first. | Token-consumption audit before page-specific styling. | Passed |
| E1-MP-T02 | — | Migrate existing current-client surfaces and charts/progress to Midnight Prism. | Preserve DOM semantics, labels, and existing lifecycle classes. | Passed |
| E1-MP-T03 | — | Add bounded interaction, section, progress, chart, loader, success/error motion. | Exact duration audit; reduced-motion fallback. | Passed |
| E1-MP-T04 | — | Run focused verification and browser smoke; record outcome/status. | Affected tests only when JSX changes; lint/build; delivery validation; final requirement audit. | Passed — user-rendered acceptance; BrowserAct unavailable as supporting evidence |

## Reserved extension sections

### E2

**Status:** Complete — approved E2 client work is implemented. Source authority:
`V2_EXTENSION.md` E2 and shared visual direction. No API, persistence,
provider, package, migration, environment, deployment, commit, or push change.

#### Traceability and verification matrix

| ID | Required behavior and boundaries | Risk / prevention | Planned independent evidence | Status |
| --- | --- | --- | --- | --- |
| E2-R01 | Recompose Dashboard into preparation home: Coach entry, exactly one next action, confidence-labelled skill snapshot, and safe recent evidence/replay access. Client presentation consumes existing owned/safe data only. | Multiple competing actions, unsupported confidence, unsafe evidence preview. Define one deterministic primary action; reuse safe existing labels/links; no raw answer/source text. | Dashboard focused success/empty/failure/retry/saved-link tests pass; existing safe skill/replay surfaces retained. | Passed |
| E2-R02 | Upgrade Job Targets with role summary, requirement priority, weighted skills, readiness, edit, reanalyse/retry, delete, and Role Simulation entry. Raw description appears only during explicit edit. Existing target API/lifecycle remains unchanged. | Expose raw descriptions, break ownership/error recovery, or make readiness a hiring claim. Reuse existing redacted display and owned actions; retain labels, confirmations, errors, and drafts. | Targets tests cover safe analysis, readiness, Role Simulation preselection/handoff, reanalysis, raw-description concealment, and failed-save draft preservation. | Passed |
| E2-R03 | Upgrade Projects with confirmed-fact status, preparation context, edit/delete, and persistent notice that extracted suggestions are not facts. Client only; do not alter confirmation semantics. | Suggestion rendered as fact or project data lost on error. Render existing confirmation state/text; preserve edit/delete/error/draft behavior. | Projects tests cover confirmed state/context, extraction disclosure, edit confirmation, failed save, resume retry, and failed delete. | Passed |
| E2-R04 | Apply labelled Midnight Prism loading, empty, error, retry, and preserved-draft states across Dashboard, Targets, Projects, Skills, Resumes, and navigation. | Colour-only/low-contrast states or a shared style changes lifecycle behavior. Use E1 tokens, visible labels/icons/focus, and existing state branches only. | Dashboard/Targets/Projects/Skills/Resumes focused state tests pass; shared E1 tokens and visible labels retained. | Passed |
| E2-R05 | Use existing Midnight Prism tokens and interaction system; add no new palette, motion framework, package, API, persistence, provider, migration, environment, deployment, commit, or push work. | Scope leaks into E3–E6 or changes contracts. Inspect final diff against source; stop for required contract/data change. | Scoped diff, client lint/build, delivery validation, and documentation reconciliation pass. | Passed |

#### Verification matrix

| Category | Planned evidence | Status |
| --- | --- | --- |
| Success | Dashboard primary action/Coach entry/skill snapshot/evidence links; Targets analysis actions; Projects confirmed context; shared state rendering. | Passed — focused page tests |
| Validation | Existing client edit/input validation and malformed-response fallbacks only where affected; no new request schema. | Passed — existing validators retained; focused Target/Project failure coverage |
| Authentication/ownership | N/A — E2 adds no API or data-access change; existing owned-resource behavior is retained through client regression. | N/A |
| State and concurrency | Existing reanalyse/delete/retry controls retain disabled/loading and duplicate-prevention behavior. | Passed — Target reanalysis disables competing actions; existing controls retained |
| Dependency/provider failure | Existing target-analysis failure/quota/retry rendering remains accurate; no provider work. | Passed — no provider change; failure/retry states retained |
| Persistence failure | Existing save/edit/delete failure and draft preservation paths remain usable. | Passed — focused Target/Project failure tests |
| Recovery/retry | Targets, Projects, Skills, Resumes, and Dashboard preserve current retry/empty/error recovery. | Passed — 63 focused tests across named pages |
| Privacy/security | Raw Job Target description restricted to explicit edit; no raw answers, provider payloads, source text, or hiring claim enters new Dashboard/Target/Project cards. | Passed — Target concealment test; safe existing data only |
| Regression | Focused Dashboard, Targets, Projects, Skills, Resumes, navigation, and V1/V2 journey tests selected after source mapping. | Passed — Dashboard/Targets/Projects/Practice/Skills/Resumes tests |
| Accessibility/responsive | Semantic labels, visible focus, 44px changed controls, reduced motion, 320px/200% review for changed views. | Passed by component/CSS review; no browser rerun without changed environment need |
| Documentation | E2 matrix/status reconciliation, scoped diff review, `npm run validate:delivery`. | Passed |

#### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E2-G01 | P1 | Dashboard shows more than one next action or invents Coach/evidence/readiness information. | Map existing safe data and deterministic priority before JSX edits; test exact primary-action rendering and fallbacks. | Resolved — one existing next action, safe existing data |
| E2-G02 | P1 | Job Target cards expose raw description outside edit or break analysis/delete/retry recovery. | Locate existing display/edit boundaries first; test concealment and current lifecycle states. | Resolved — Target tests cover concealment, reanalysis, and draft failure |
| E2-G03 | P1 | Project suggestions appear confirmed or edit/delete loses disclosure/drafts. | Reuse confirmed status and disclosure copy; test both fact states and failure recovery. | Resolved — confirmation/disclosure and recovery tests pass |
| E2-G04 | P1 | Shared state styling hides an error/retry/focus state or creates colour-only meaning. | Preserve text/icon labels and focus; inspect changed states under reduced motion and narrow viewport. | Resolved — labelled state branches and E1 primitives retained |
| E2-G05 | P1 | E2 requires API/data/provider/package work not authorised here. | Stop, document exact gap, request scope approval before edits. | Resolved — existing update API reused; no non-client change |
| E2-T01 | Read only direct Dashboard/Targets/Projects/Skills/Resumes/navigation components, existing tests, and data contracts. | Exact source map and affected test list; no source change. | Passed |
| E2-T02 | Implement Dashboard preparation home from existing safe data. | One next action plus Coach/evidence/skill surfaces with full state handling. | Passed — focused Dashboard tests |
| E2-T03 | Implement Job Target and Project card/action/disclosure updates. | Required analysis/fact/context/action hierarchy without lifecycle changes. | Passed — focused Targets/Projects/Practice tests |
| E2-T04 | Apply shared state treatment to named workspaces/navigation and verify. | Consistent labelled loading/empty/error/retry/draft states; no new design system. | Passed — focused state tests, lint/build, diff, delivery validation |

#### Approval boundary

Approve E2 only if scope remains client presentation over existing data and
actions. Any required API, persistence, provider, package, migration,
environment, deployment, commit, or push change stops for separate approval.

### E3

**Status:** Complete — approved client presentation is implemented and
user-rendered acceptance is recorded. Source authority: `V2_EXTENSION.md` E3 and shared
visual direction. No API, persistence, provider, package, migration,
environment, deployment, commit, or push change.

#### Traceability and verification matrix

| ID | Required behavior and boundaries | Risk / prevention | Planned independent evidence | Status |
| --- | --- | --- | --- | --- |
| E3-R01 | Apply Midnight Prism hierarchy to Practice setup, active cockpit, in-place feedback, and completed replay/result. Preserve existing content, routes, interview state, and V1 rendering. | Polish changes dominant action or breaks active/result lifecycle. Reuse E1 tokens/classes and existing semantic regions; change presentation only unless a direct recovery label is missing. | 55 focused Practice/result tests, CSS review, and user-rendered acceptance. | Passed |
| E3-R02 | Keep one dominant interview action, dependable text answering, constrained voice, and current recovery behavior. | New hierarchy obscures text baseline, voice fallback, submit/next/complete controls, or draft. Preserve control names, disabled/loading states, live feedback, and draft state. | Focused text/voice, draft, submit/next/complete failure/retry tests pass. | Passed |
| E3-R03 | Clarify drafts, loading, quota, failure, retry, completion, and evidence-sync states without inventing progress or altering lifecycle behavior. | Decorative state hides error/retry, claims false progress, or exposes unsafe provider detail. Use explicit existing labels/alerts; no new simulated progress, API, provider, or persisted state. | Quota, malformed response, draft, retry, completion, and recovery tests pass. | Passed |
| E3-R04 | Use only Midnight Prism tokens and bounded shared motion; motion clarifies current state, respects reduced motion, never fabricates progress, and never conceals error/retry. | Motion distracts or conflicts with E1 timing/accessibility contract. Reuse 120/160–200/240/400ms E1 bounds and existing reduced-motion override. | E1 motion tokens/reduced-motion override retained; CSS review and user acceptance pass. | Passed |
| E3-R05 | Add no API, persistence, provider, package, migration, environment, deployment, commit, or push work. Preserve DSA/HR/System Design, resume, text, voice, feedback, completion, targeted-practice, Role Simulation, Project Defense, and historical-result compatibility. | Scope leaks into E4–E6 or weakens V1 paths. Stop for any contract/data requirement; inspect final diff against all journeys. | Scoped diff, lint/build, delivery validation pass; CSS/status only. | Passed |

#### Verification matrix

| Category | Planned evidence | Status |
| --- | --- | --- |
| Success | Setup, active text interview, feedback, completed replay/result, and safe evidence presentation retain expected hierarchy and actions. | Pending approval |
| Validation | Existing setup selection, targeted-focus, malformed metadata/result, and text constraints remain validated; no new request schema. | Pending approval |
| Authentication/ownership | N/A — E3 adds no API/data-access change; protected-route and owned replay behavior remain covered by existing regression. | N/A |
| State and concurrency | Existing idempotency, disabled controls, pending answer/next/complete, and retry state remain unchanged. | Pending approval |
| Dependency/provider failure | Existing quota, provider, transcription, and parser-safe states remain accurate; no provider change. | Pending approval |
| Persistence failure | Existing draft, saved-answer, completion, and result-recovery paths remain usable. | Pending approval |
| Recovery/retry | Text/voice fallback, answer/next/complete retry, and result replay recovery remain visible and actionable. | Pending approval |
| Privacy/security | No raw provider payload, hidden reason, private answer, or hiring claim added to cockpit/feedback/result presentation. | Pending approval |
| Regression | Focused Practice, voice, result/replay, targeted-practice, Role Simulation, Project Defense, and V1 text-flow tests selected after source mapping. | Pending approval |
| Accessibility/responsive | One dominant labelled action, semantic/live status, visible focus, 44px changed controls, reduced motion, and 320px/200% review for changed views. | Pending approval |
| Documentation | E3 matrix/status reconciliation, scoped diff review, and `npm run validate:delivery`. | Pending approval |

#### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E3-G01 | P1 | Hierarchy changes hide text answer, voice fallback, active question, feedback, replay, or dominant action. | Map existing Practice/result states before JSX/CSS edits; test each affected state and control. | Pending approval |
| E3-G02 | P1 | Styling implies fabricated progress, hides quota/failure/retry, or changes bounded interview lifecycle. | Use existing state values/labels only; no timers or behavior state; assert visible error/retry. | Pending approval |
| E3-G03 | P1 | Draft or saved result becomes unavailable after failure/retry. | Preserve current state ownership and run draft/result-recovery regressions. | Pending approval |
| E3-G04 | P1 | Voice or V1 text journey regresses while styling cockpit/result. | Keep text path baseline; run constrained-voice and V1 setup/result tests. | Pending approval |
| E3-G05 | P1 | Motion violates reduced-motion or makes an error/retry state less visible. | Use E1 variables/override; review selectors and do not animate semantic state away. | Pending approval |
| E3-G06 | P1 | E3 requires API/data/provider/package work not authorised here. | Stop, record exact requirement, request separate approval before edits. | Pending approval |
| E3-T01 | Read only direct Practice, result/replay, voice, and related focused tests/styles. | Exact source map, state inventory, and affected-test list; no source change. | E3 approval after matrix review. | Pending approval |
| E3-T02 | Apply setup/cockpit/feedback hierarchy using existing components/state. | One dominant action with clear question, answer, draft, feedback, and recovery states. | E3-T01; focused Practice and voice tests. | Pending approval |
| E3-T03 | Apply result/replay hierarchy and evidence-state clarity. | Completed/recovery/replay result remains safe, legible, and linked without lifecycle changes. | E3-T01; focused result/replay tests. | Pending approval |
| E3-T04 | Verify changed journeys and final scope. | Narrow regression, lint/build, scoped diff, delivery validation; browser smoke only if direct browser-only evidence is needed. | E3-T02–T03. | Pending approval |

#### Approval boundary

Approve E3 only for client presentation and direct accessibility/recovery labels
over existing interview/result state. Any API, persistence, provider, package,
migration, environment, deployment, commit, or push change stops for separate
approval.

### E4

**Status:** Complete — approved E4 implementation is verified. Source authority:
`V2_EXTENSION.md` E4. No provider, persistence, migration, package,
environment, deployment, commit, or push change.

#### Implementation plan

1. Add `coachSchemas` query validation: exact `context=overall|target|project`; `target` requires only `targetId`, `project` requires only `projectId`, `overall` accepts neither, each identifier is one valid ObjectId, and unsupported, repeated, or ambiguous fields fail safely.
2. Add a pure `coachRoadmapService`, injected with a **new read-only** skill-evidence projection plus existing Job Target, Project, and interview/replay reads. It must not call `skillEvidenceService.getProfile()`: that current method reconciles pending evidence and writes. The Coach projection reuses the same formula/rules, reports `pending` from a bounded owned pending-session existence read, and never reconciles, writes, calls AI, caches, or changes interview contracts.
3. Produce one exact safe DTO: context `{kind,label}`, `evidenceSyncStatus`, at most 12 safe skill summaries, and exactly 3–5 fixed-vocabulary actions `{type,label,description,to}`. Links are server allow-listed internal paths only.
4. Rank deterministically: Overall reuses recommended weak/non-established skill; Target uses analysis weight then evidence/mastery/confidence then key; Project uses confirmed coverage categories with insufficient/weak evidence then stable key. Empty data produces honest context-building actions, never invented evidence.
5. Add thin controller/route with `requireAuth`; derive `userId` only from auth. Missing/foreign Target or Project becomes the same `404 COACH_CONTEXT_UNAVAILABLE` safe error, without resource details. Register route in `app.js` with existing-style in-code read limits: 120 requests/user/15 minutes and 240 requests/IP/15 minutes, injectable for tests, with no provider or environment configuration change.
6. Add client API parser and Dashboard Coach panel. Overall is default; Target/Project require explicit selector choice. Render labelled loading, empty, pending-sync, unavailable-context, malformed-response, error, and retry states; use shared Midnight Prism semantic tokens and reduced-motion behavior. Use only current Practice handoffs: targeted practice may prefill `focusSkillKey`; Role Simulation may prefill `type` and `targetId`; Project Defense links set `type` and leave the user to choose the confirmed project. E6 owns any broader planner/preselection integration.
7. Verify server validation/ownership/ordering/serialization/no-write behavior and client fallback/action links; then focused lint/build, delivery validation, and scoped diff. Browser smoke only if component evidence cannot prove a browser-only condition.

#### Traceability and verification matrix

| ID | Required behavior and boundaries | Risk / prevention | Planned independent evidence | Status |
| --- | --- | --- | --- | --- |
| E4-R01 | Add protected read-only `GET /api/coach/roadmap` with exact explicit Overall, owned Job Target, or owned confirmed Project Defense selection and a protected-read limit of 120/user/15 minutes plus 240/IP/15 minutes. | Foreign/missing context leaks existence/data or unbounded reads enable abuse. Auth-derived user, exclusive exact query schema, owned queries, existing-style per-user/IP limit, identical `COACH_CONTEXT_UNAVAILABLE` response. | Focused route tests pass for auth, malformed selection, ownership/missing parity, user/IP limits, and valid contexts. | Passed |
| E4-R02 | Return safe context label, evidence-sync state, bounded skills, and 3–5 deterministic safe-link actions. Overall ranks existing recommendation; Target ranks weight then evidence/mastery/confidence; Project ranks insufficient/weak confirmed coverage. | Non-determinism, invalid link, excess action, private field, or hiring claim. Bounded DTO, allow-list links, stable tie-breaks. | Target/Project ordering, caps, and negative source-text serialization assertions pass. | Passed |
| E4-R03 | Actions only add context, confirm project, collect evidence, targeted practice, retest, or replay review. No AI call, write, cache, or persistence. | Invented action/prompt/hidden reasoning/provider work, including indirect evidence reconciliation. Fixed action vocabulary and a read-only deterministic service; never call mutating `getProfile()`. | Focused route test proves no evidence `bulkWrite`/`updateOne`; source review confirms no provider/cache/write path. | Passed |
| E4-R04 | Coach UI has loading, empty, pending-sync, unavailable-context, malformed-response, retry states; Midnight Prism labels and reduced motion. | Malformed response trusted or recovery hidden. Strict client schema and labelled fallback. | Coach component tests pass for context selection, safe links, empty/pending, malformed fallback, retry, and labels. | Passed |
| E4-R05 | No migration, graph store, provider, package, environment, deployment, commit, or push change; journeys remain compatible. | E5/E6 scope leak or interview contract change. Final contract/diff review. | Focused server/client tests, lint, client build, delivery validation, and scoped diff pass. | Passed |

#### Verification matrix

| Category | Affected boundary | Planned independent evidence | Status |
| --- | --- | --- | --- |
| Success | Route, service, client panel | Overall, owned ready Target, and owned confirmed Project return/render their bounded Coach roadmap and safe actions. | Passed |
| Validation | Query validator and client parser | Reject unknown context, invalid/multiple/missing identifiers, extra fields, and malformed API payloads safely. | Passed |
| Authentication/ownership | Auth middleware, Target/Project reads | Unauthenticated request is rejected; foreign and missing contexts have the same safe result. | Passed |
| State and concurrency | Read-only service and client request state | No mutation, cache, duplicate side effect, or stale response replaces a newer selected context. | Passed |
| Dependency/provider failure | Service boundary | N/A — E4 adds no provider or external dependency call; an existing read failure maps to the safe unavailable/error state. | N/A |
| Persistence failure | Existing data reads only | N/A — E4 writes nothing, including evidence reconciliation; unavailable/incomplete saved data produces pending/empty actions without data repair. | N/A |
| Recovery/retry | Dashboard Coach panel | Pending sync, unavailable context, malformed response, and read error each retain a labelled retry or safe fallback. | Passed |
| Privacy/security | DTO serializer and UI | Assertions exclude raw answers, provider payloads, source text, hidden reasoning, storage IDs, private evidence, and hiring/readiness guarantees. | Passed |
| Regression | Interview, Target, Project, replay contracts | Existing target/project and Practice/replay handoffs remain unchanged; action links use existing safe routes only. | Passed |
| Accessibility/responsive | Dashboard Coach panel | Text-labelled context/options/actions, keyboard-operable selector/link controls, visible focus, responsive reflow, and reduced-motion compliance. | Passed |
| Documentation | API/status/extension record | Update only affected API/status documentation after implementation; delivery validation and scoped diff match approved scope. | Passed |

#### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E4-G01 | P0 | Ownership or safe-serialization bypass. | Auth-derived user, owned queries/projections, DTO allow-list, adversarial tests. | Resolved |
| E4-G02 | P1 | Ranking/action order non-deterministic or exceeds bounds. | Pure capped service and stable ties. | Resolved |
| E4-G03 | P1 | Raw/private/provider data or hiring claim exposed. | Negative serialization tests. | Resolved |
| E4-G04 | P1 | UI lacks truthful unavailable/malformed/retry recovery, or a Coach read mutates pending evidence. | Schema validation, labelled fallback, and no-write tests. | Resolved |
| E4-T01 | Map current API/error shapes, authentication middleware, skill evidence, Target, Project, interview/replay read models, Dashboard composition, and direct tests. | Prevent duplicate contract/serializer or E5/E6 work. Record exact reuse points and N/A boundaries before code. | Read-only source map completed before implementation. | Passed |
| E4-T02 | Backend validation: add the dedicated Coach query schema and route-level validation for `overall`, `target`, and `project`. | Reject malformed/ambiguous query input before reads; retain the existing safe error shape. | Validator and route tests pass for invalid/ambiguous/foreign/missing contexts. | Passed |
| E4-T03 | Backend data access and service: add/read a non-mutating skill-profile projection that reuses the evidence formula, detects pending status with one bounded owned existence read, and never invokes reconciliation; build an injected, pure roadmap service from that projection, ready Target analysis, confirmed Project coverage, and strictly projected safe replay metadata. | No provider, write, cache, migration, or new persistence model; context is owned before data is used. `getProfile()` is excluded because it may write pending evidence. | Focused route/unit tests pass for ordering, safe projection, pending status, and zero evidence writes. | Passed |
| E4-T04 | Backend contract: add thin authenticated controller/route, injectable 120/user/15-minute and 240/IP/15-minute existing-style read limits, and app registration. Serialize only the exact safe DTO and allow-listed internal action links; map missing/foreign context to `COACH_CONTEXT_UNAVAILABLE`. | Prevent ownership leaks, raw/private output, unsupported action types, unbounded read abuse, a resource-specific error, and contract drift. | Focused integration tests pass for auth, ownership, safe shape, and user/IP limits. | Passed |
| E4-T05 | Frontend data boundary: add the Coach API wrapper and strict response parser without weakening existing client request/error handling. | Untrusted payload never renders as fact; malformed payload reaches a labelled fallback. | Focused component tests pass for malformed response fallback and retry. | Passed |
| E4-T06 | Frontend Coach surface: add the Dashboard panel, explicit Overall/Target/Project context selector, bounded skill/action rendering, and only existing-route handoffs (`focusSkillKey`, Role `type`/`targetId`, Project `type`). | Preserve one clear next action; no colour-only meaning, fabricated readiness/progress, or unapproved Practice preselection change. | Focused component tests pass for selection, exact link, empty/pending, retry, and labels. | Passed |
| E4-T07 | Apply only existing Midnight Prism semantic tokens and reduced-motion-compatible transitions to the new Coach surface. | No palette/framework expansion and no motion that hides status or changes behavior. | CSS/source review and shared reduced-motion override retained. | Passed |
| E4-T08 | Final audit and verification. | Reconcile every E4 requirement with final diff and evidence; stop for any contract/data/provider/scope deviation. | Focused tests, lint, client build, delivery validation, and scoped diff pass. | Passed |

#### Approval boundary

Approve E4 only for this read-only deterministic Coach API and client surface.
Any provider call, persistence, migration, package, environment, deployment,
commit, or push change stops for separate approval.

### E5

**Status:** Complete — implemented and verified on 2026-10-07. Source authority:
`V2_EXTENSION.md` E5 and shared E1–E4 safety/compatibility rules.

#### Implementation plan

1. Reuse E4's exact authenticated Coach context selection (`overall`, owned
   ready Job Target, owned confirmed Project) and its shared Coach read limit;
   add protected read-only `GET /api/coach/tree`. Extract only genuinely shared
   selection, safe-label, and coverage-definition logic from the E4 roadmap
   service into a focused Coach helper if needed. Preserve E4 response and tests.
2. Add a pure `coachKnowledgeTreeService` using E4's read-only evidence
   projection. It must never call mutating `skillEvidenceService.getProfile()`,
   reconcile pending evidence, write, cache, invoke AI, or alter interview
   contracts. Pending sync comes from the existing bounded owned existence read.
3. Derive bounded server-side nodes and edges from owned saved records only.
   Target branches are safe analysed requirements and their weighted skills;
   Project branches are only non-empty confirmed coverage categories and their
   category skills; Overall has an explicitly labelled direct skill-evidence
   branch because it has no selected requirement or confirmed coverage source.
   Never fabricate a requirement, category, skill, score, or relationship.
4. Define exact safe DTO limits: one context root, at most 12 branch nodes, at
   most 12 skill nodes, at most 25 total nodes and 24 edges, plus an honest
   `omittedSkillCount`. Every skill node contains only safe key/label, evidence
   count, categorical confidence, nullable derived mastery, evidence state
   (`no_evidence`, `provisional`, `emerging`, `established`), and optional
   allow-listed owned completed-replay link. Edges reference known node IDs only.
5. Build replay links from bounded owned `SkillEvidence` and completed
   `InterviewSession` projections. Return only `/practice/:id/results`; never
   expose answer text, prompt, feedback text, reason code, source text, storage
   ID, provider payload, hidden reasoning, or a hiring/readiness claim.
6. Add strict client API parser for exact context/tree/node/edge/replay shape,
   bounds, unique IDs, parent relationships, and safe internal links. Lift the
   existing Coach context selector into one shared Dashboard Coach workspace so
   Roadmap and Tree use same explicit selection without duplicated state.
7. Add `CoachTreePanel`: semantic ordered-list content first, visible labels for
   no evidence/provisional/emerging/established, omitted-count explanation, and
   labelled loading/empty/pending/unavailable/malformed/error/retry states.
   Add responsive CSS plus decorative `aria-hidden` SVG/CSS connectors only on
   wider screens after list content exists; reuse Midnight Prism tokens and
   reduced-motion override. No graph/visualization package.
8. Verify API validation, ownership, node/edge/replay bounds, deterministic
   ordering, no-write behavior, parser fallback, accessible ordered-list
   rendering, and E4 roadmap regression. Then run affected lint/build,
   delivery validation, and scoped diff. Browser smoke only if a browser-only
   tree-layout condition remains unprovable by code evidence.

#### Traceability and verification matrix

| ID | Required behavior and boundaries | Risk / prevention | Planned independent evidence | Status |
| --- | --- | --- | --- | --- |
| E5-R01 | Add protected read-only `GET /api/coach/tree` using E4's exact Overall/owned ready Target/owned confirmed Project selection, authentication, safe missing/foreign behavior, and shared Coach rate limit. | Context data leak, selection drift, or unbounded read route. Reuse exact validator/context resolver, auth-derived user, owned filters, `COACH_CONTEXT_UNAVAILABLE`, and E4 120/user + 240/IP/15-minute limit. | Route tests cover unauthenticated, malformed, Overall/Target/Project, and foreign/missing parity; E4 rate-limit route tests protect shared middleware. | Passed |
| E5-R02 | Derive tree nodes/edges server-side from selected context requirements or confirmed coverage categories, then tested skills. Overall shows an explicit direct-evidence branch rather than invented requirements. | Fabricated relationships or raw Target/Project facts. Safe projected fields only; fixed Project coverage definitions; stable key/source-order ties. | Route tests assert Target and Project safe branch/skill output; source/diff review confirms Overall direct-evidence branch and fixed coverage definitions. | Passed |
| E5-R03 | Return bounded safe tree: <=25 nodes, <=24 edges, <=12 branches, <=12 skills, unique IDs, valid edges, and honest omitted count. | Large/malformed/cyclic graph or hidden truncation. Fixed caps, de-duplication, stable priority, and explicit omission summary. | Server bounds assertions plus source review prove capped allocation; strict client parser rejects oversize, duplicate, invalid-parent, and unsafe graph structure. | Passed |
| E5-R04 | Skill nodes expose only safe label/key, evidence count, confidence, nullable mastery, visible evidence state, and optional owned completed replay link. | Private answer/source/provider/reason/storage data or foreign/active replay link leaks. Bounded projections, allow-listed serializer, completed-session join. | Safe-serialization test excludes private Target text; client parser allows only internal completed replay shape; projection/diff review confirms allow-list. | Passed |
| E5-R05 | Tree remains deterministic read-only: no AI call, profile reconciliation, write, cache, model/package/migration/environment/deployment change, or interview lifecycle change. | Indirect pending-evidence write or E6 scope leak. Reuse E4 read-only profile; inject service dependencies; final contract/diff audit. | `bulkWrite`/`updateOne` spies remain untouched; service uses `getReadOnlyProfile`; focused tests/lint/build and scoped diff show no prohibited scope. | Passed |
| E5-R06 | Dashboard shows one shared Coach context selector, Roadmap remains compatible, and Tree provides ordered-list-first accessible fallback plus wide-screen decorative CSS/SVG enhancement. | Duplicated selection diverges, colour-only state, inaccessible graph, or motion hides content. Lift selection state once; text labels/focus; SVG `aria-hidden`; list remains DOM-first; E1 motion/reduced-motion tokens. | Shared workspace, Coach regression, Tree ordered-list/retry/replay tests, parser tests, and CSS review pass. CSS enhancement is responsive; no SVG is needed for semantic content. | Passed |

#### Verification matrix

| Category | Affected boundary | Planned independent evidence | Status |
| --- | --- | --- | --- |
| Success | Coach route/service and Dashboard workspace | Overall, owned ready Target, and owned confirmed Project return/render bounded tree and correct safe branches/skills. | Passed |
| Validation | Shared Coach query validator and tree parser | Reject invalid/repeated/extra query values and malformed, duplicate, cyclic, oversized, or unsafe client tree payloads. | Passed |
| Authentication/ownership | Auth middleware, Target/Project/evidence/session reads | Unauthenticated denied; foreign/missing selected context identical; replay link only for owned completed session. | Passed |
| State and concurrency | Read-only tree service and shared context client state | No mutation/cache/duplicate side effect; context change aborts or ignores stale Roadmap/Tree response. | Passed |
| Dependency/provider failure | Service boundary | N/A — no provider/external dependency added. Existing read failure maps to labelled safe error/retry. | N/A |
| Persistence failure | Existing data reads only | N/A — E5 writes nothing. Missing/incomplete data yields no-evidence, pending, empty, or unavailable state without repair. | N/A |
| Recovery/retry | Coach workspace | Loading, empty, pending-sync, unavailable, malformed, error, and retry are visible and actionable. | Passed |
| Privacy/security | Tree serializer, replay projection, client parser | Assertions exclude raw answer/prompt/feedback/source/provider/reason/storage/private evidence/hiring claim; paths stay internal. | Passed |
| Regression | E4 Coach, existing Practice/Target/Project/replay | E4 roadmap remains compatible; existing selection/handoffs and saved-result routes remain unchanged. | Passed |
| Accessibility/responsive | Ordered list, selector, CSS enhancement | Text labels, semantic nested lists, keyboard selector/links, visible focus, responsive reflow, and reduced motion; no SVG is required for content. | Passed |
| Documentation | API/status/extension records | Update affected API/status records only after implementation; delivery validation and scoped diff match E5. | Passed |

#### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E5-G01 | P0 | Tree exposes foreign context, private evidence, raw content, or an unsafe replay. | Owned queries/projections, safe DTO allow-list, completed-session join, adversarial serialization tests. | Controlled — passed |
| E5-G02 | P1 | Tree calls E4 mutating profile recovery or otherwise writes during read. | Explicit read-only projection dependency; spies assert no `bulkWrite`/`updateOne`/provider call. | Controlled — passed |
| E5-G03 | P1 | Nodes/edges are fabricated, cyclic, unstable, unbounded, or hide truncation. | Fixed caps, stable comparator, server edge derivation, omission count, structural tests. | Controlled — passed |
| E5-G04 | P1 | Tree graph is visual-only, duplicate selector state drifts, or recovery is hidden. | Shared selection owner; semantic ordered list first; strict parser; labelled fallback/retry tests. | Controlled — passed |
| E5-G05 | P1 | E5 changes E4 API, Practice lifecycle, provider, persistence, graph store, or package scope. | Preserve contracts; use existing folders/CSS/SVG; stop for any out-of-scope need. | Controlled — passed |
| E5-T01 | Map E4 Coach modules, evidence/session projections, Target/Project coverage, Dashboard selection/state, route tests, and CSS motion primitives. | Name exact reuse/extraction points and E5-only files before edits; no source change. | Source map completed. | Passed |
| E5-T02 | Extract minimal shared Coach selection/context/coverage helper only if E4 and Tree would otherwise duplicate behavior. | Preserve `GET /api/coach/roadmap` DTO, errors, limits, and tests byte-for-contract. | Shared client selection owner added; server retained small parallel owned-read services to avoid E4 DTO/refactor risk. | Passed |
| E5-T03 | Add tree validator/service/controller/route within existing Coach layers and shared rate-limit router. | Exact selection, owned bounded reads, deterministic nodes/edges/replay links, no writes/provider/cache. | Route/service and focused integration tests pass. | Passed |
| E5-T04 | Add strict tree API wrapper/parser and lift one Coach context-selection state owner in Dashboard. | Reject untrusted graph payload; Roadmap and Tree request same selected context; stale results cannot replace current selection. | Parser, workspace, and E4 Coach tests pass. | Passed |
| E5-T05 | Add accessible ordered-list Tree panel, honest evidence/omission labels, recovery UI, responsive CSS/SVG enhancement, and reduced-motion behavior. | List works without enhancement/motion; SVG decorative only; no colour-only semantics. | Tree component tests and responsive/reduced-motion CSS review pass. | Passed |
| E5-T06 | Final audit, documentation, and verification. | Compare final diff to every E5 row; record N/A/deviation; stop on scope/security conflict. | Focused tests, affected lint/build, delivery validation, and scoped diff pass; browser unnecessary. | Passed |

#### Approval boundary

Approve E5 only for the read-only deterministic Coach knowledge-tree API,
shared Coach selection refactor, Dashboard tree surface, and direct tests/docs.
Any provider call, write, migration, graph store, dependency/package,
environment, deployment, commit, or push change stops for separate approval.

### E6

**Status:** Complete — verified implementation on 2026-10-07. Source authority:
`V2_EXTENSION.md` E6, the existing interview-start contract, and shared E1–E5
safety/compatibility rules.

#### Implementation plan

1. Add protected read-only `GET /api/interviews/plan` before the existing
   `/:id` interview route. Use a new strict query validator that mirrors the
   start-selection fields and dependencies without accepting an idempotency key:
   `interviewType`, `level`, optional `jobTargetId` for Role Simulation,
   optional `projectId` for Project Defense, optional owned completed
   `resumeId`, and `sessionPurpose=targeted_practice` with `focusSkillKey`.
   Reject repeated, unknown, ambiguous, mismatched, and malformed fields before
   any read. The route derives `userId` from authentication and uses a bounded
   read-only user/IP preview limit, not the AI generation limit.
2. Add a thin planner controller and deterministic `interviewPlanService` in
   the existing route/controller/service layers. It must use existing owned
   Target/Project snapshot services and `assertOwnedCompletedResume` only to
   validate selection; it must never return, render, cache, or persist resume
   text, project facts, Job Target description, provider input, prompt, answer,
   feedback, hidden reasoning, or database IDs.
3. Extract the pure, existing Role Simulation and Project Defense coverage
   ordering into a focused shared deterministic coverage helper only where it
   prevents planner/interview drift. Preserve the current start and adaptive
   input DTOs and tests. Target coverage remains descending saved skill weight
   with source-order ties; Project coverage remains the existing non-empty
   confirmed-category order. Targeted practice takes precedence exactly as the
   current adaptive input does.
4. For targeted practice, use `skillEvidenceService.getReadOnlyProfile()` and
   require the same owned weak skill that start accepts, without invoking
   `getOwnedWeakSkill()` or pending-evidence reconciliation. For standard DSA,
   HR, and System Design, return fixed type/level planning labels only: these
   flows have no saved deterministic coverage plan and must not invent one.
5. Define one bounded safe preview DTO: selection summary, safe context label
   when applicable, one opening focus, at most five ordered intended stages,
   bounded categorical evidence/context rationale, and the fixed statement
   that later questions adapt to answers and are not prewritten. Stages describe
   coverage/progression only; they never contain question wording or promise
   an exact generated sequence, score, readiness, or hiring outcome.
6. Add a strict client planner API adapter/parser. It accepts only the exact
   bounded DTO, internal safe labels/keys, known context/type/level values, and
   stage/rationale enums. Malformed data becomes a labelled recoverable state;
   stale requests are aborted or ignored when any selection changes.
7. Add one reusable `InterviewPlannerPreview` surface. Practice loads it only
   after its current selections are valid, preserves all choices and answer
   drafts on loading/error/retry, lets users adjust type, level, context, and
   safe weak-skill focus, and requires a current valid preview before calling
   the unchanged `POST /api/interviews` start flow. Coach uses the same surface
   with its shared context: Target selects Role Simulation, Project selects
   Project Defense, and Overall offers compatible standard/targeted practice.
   Context/type controls prevent invalid combinations rather than silently
   rewriting user choices.
8. Keep Roadmap actions as canonical Practice setup links. Adjust only their
   query preselection where required for planner compatibility; do not change
   action authorization, quota handling, draft lifecycle, question generation,
   result/replay routes, or existing interview persistence. Use Midnight Prism
   planning/progress states, text labels, visible focus, responsive layout, and
   E1 reduced-motion rules. No graph/package/provider/migration/environment or
   deployment work.
9. Verify read-only API selection/privacy/order/bounds, no-provider/no-write
   behavior, strict client fallback, Practice and Coach preview recovery, and
   unchanged start/interview contracts. Run focused affected tests, lint/client
   build, delivery validation, and scoped diff review. Use one browser smoke
   only if a preview-only interaction cannot be proven by deterministic tests.

#### Traceability and verification matrix

| ID | Required behavior and boundaries | Risk / prevention | Planned independent evidence | Status |
| --- | --- | --- | --- | --- |
| E6-R01 | Add authenticated read-only `GET /api/interviews/plan` with the same valid type/level/Target/Project/resume/targeted-practice selection combinations as start, excluding only start idempotency. | Planner accepts a combination start rejects, leaks ownership, or route ordering treats `plan` as an ID. Strict dedicated query validator; route precedes `/:id`; auth-derived user; owned services; missing/foreign parity. | Integration tests: unauthenticated, all valid combinations, malformed/repeated/unknown/mismatched query, missing/foreign Target/Project/resume/skill parity, and route order. | Passed |
| E6-R02 | Derive preview deterministically from existing adaptive coverage rules: weighted Target skills, confirmed Project categories, and targeted weak-skill precedence; generic types expose fixed non-invented planning labels only. | Planner/start coverage drift or fabricated generic coverage. Extract narrow pure shared coverage helper; reuse existing constants/order; generic preview has no claimed skill coverage. | Unit tests compare planner coverage/order with current adaptive inputs for Role, Project, targeted practice, and generic type/level fallback. | Passed |
| E6-R03 | Return a safe bounded preview: selection/context summary, opening focus, at most five progression stages, categorical evidence/context rationale, and explicit adaptive/non-prewritten notice. | Preview exposes raw records, becomes pre-generated questions, exceeds five stages, or implies readiness/hiring certainty. Allow-listed DTO; hard length/count/enum bounds; fixed neutral copy; no prompt field. | DTO boundary/negative serialization tests: no prompt, raw source/facts/resume/evidence reason/provider/ID, readiness, or hiring claim; exact stage cap and notice. | Passed |
| E6-R04 | Planner is read-only: no Gemini/provider invocation, AI quota use, pending-evidence reconciliation, cache, session creation, write, migration, or interview contract change. | Preview triggers cost, persistence, or hidden mutable recovery. Separate read rate limit; read-only profile; provider/write spies; final contract/diff audit. | Unit/integration spies prove no provider, `bulkWrite`, `updateOne`, `create`, or cache call; existing start route regression remains unchanged. | Passed |
| E6-R05 | Practice shows preview before start, retains selections/drafts through loading/error/retry, lets user change valid type/level/context/focus, and only starts through existing unchanged start request after a current valid preview. | Stale preview starts wrong context, preview failure loses work, or new UI changes start payload/lifecycle. Abort/request-version guard; disable start until matching preview; preserve existing idempotency reset and start adapter. | Component tests for valid preview, selection change/stale response, loading/error/retry, targeted focus, preserved draft/choices, and exact existing `startInterview` call. | Passed |
| E6-R06 | Coach shows same preview before a Practice handoff; Roadmap links preselect compatible setup without changing E4 action semantics. | Coach selector/type mismatch, duplicate preview logic, or unsafe direct start from Dashboard. Reusable preview component; context-constrained type controls; safe internal Practice handoff only. | Coach workspace tests for Overall/Target/Project compatibility, preview recovery, and safe Practice link; E4/E5 regression tests. | Passed |
| E6-R07 | Preserve accessibility, responsive Midnight Prism presentation, reduced motion, and all existing V1/V2 interview, result, replay, quota, and draft behavior. | Visual-only state, colour-only meaning, hidden recovery, or regression of dependable text journey. Semantic labelled stages/status, focus-visible controls, mobile CSS, existing reduced-motion token, focused regressions. | Component accessibility/state checks, CSS/source review, focused Practice/interview/result tests, lint/build, delivery validation, and scoped diff. | Passed |

#### Verification matrix

| Category | Affected boundary | Planned independent evidence | Status |
| --- | --- | --- | --- |
| Success | Planner route/service; Practice and Coach preview | Valid Overall, Target, Project, resume, and targeted selections return/render safe bounded previews and hand off to unchanged start. | Passed |
| Validation | Query validator; client parser | Reject malformed, repeated, unknown, mismatched, missing, oversized, unsafe, and stale selection/preview data before render or side effect. | Passed |
| Authentication/ownership | Auth; Target/Project/Resume/Skill reads | Unauthenticated is denied; foreign/missing selections are indistinguishable; only owned ready/confirmed/completed/weak sources qualify. | Passed |
| State and concurrency | Preview requests and existing start flow | No preview write/cache/provider call; selection change aborts/ignores stale preview; start remains idempotent and uses matching current selection. | Passed |
| Dependency/provider failure | Planner boundary | N/A — planner adds no provider/dependency call. Existing read failure maps to safe labelled retry. | N/A |
| Persistence failure | Read-only preview | N/A — planner writes nothing. Existing start persistence/recovery contract remains separately regression-tested. | N/A |
| Recovery/retry | Practice/Coach preview UI | Loading, unavailable, malformed, generic empty, read error, retry, and retained-choice/draft states are visible and actionable. | Passed |
| Privacy/security | Serializer; parser; logs | No raw resume/Target/Project/evidence/provider/prompt/answer/feedback/reason/storage data, IDs, or readiness/hiring claim escapes. | Passed |
| Regression | Start, adaptive engine, Coach, Practice, results/replay | Existing start payload, quota, drafts, text/voice flow, adaptive generation, saved result, and E4/E5 surfaces remain compatible. | Passed |
| Accessibility/responsive | Shared preview component and controls | Semantic labelled plan/stages/status, keyboard focus, non-colour states, reflow, Midnight Prism tokens, and reduced motion. | Passed |
| Documentation | API/design/status/extension records | Update contracts and live status only after code evidence; delivery validation and scoped diff agree with actual E6 behavior. | Passed |

#### Risk-remediation and task matrix

| ID | Severity | Task / failure gate | Control and completion evidence | Status |
| --- | --- | --- | --- | --- |
| E6-G01 | P0 | Planner exposes foreign/private records, raw source/resume/project facts, provider data, prompts, or hiring/readiness claims. | Owned reads, safe allow-list DTO, generic error parity, adversarial serialization/parser tests, safe logging review. | Passed |
| E6-G02 | P1 | Preview differs from start-valid selection or adaptive coverage precedence. | Dedicated selection validator derived from start rules; narrow shared pure coverage helper; contract comparison tests across all supported modes. | Passed |
| E6-G03 | P1 | Preview invokes provider/AI rate limiter/reconciliation or writes/caches/creates a session. | Dedicated read route/limit, read-only profile, injected dependency spies, final route/service/diff audit. | Passed |
| E6-G04 | P1 | Preview falsely presents generated questions, exact future sequence, score, readiness, or hiring result. | Fixed adaptive notice, stage-only DTO, no prompt field, neutral bounded labels, negative tests. | Passed |
| E6-G05 | P1 | Stale or failed preview changes choices/drafts or causes wrong/duplicate interview start. | Request abort/version guard, start gating, retained local state, existing idempotency/start regression tests. | Passed |
| E6-G06 | P1 | Coach and Practice duplicate incompatible selection/preview rules or Roadmap changes scope. | One reusable preview/parser and constrained type/context controls; E4/E5 action/link regressions. | Passed |
| E6-T01 | Map start validator, route order, adaptive coverage inputs, owned snapshot/resume/profile reads, Coach actions, Practice state, and direct tests. | Identify extraction points and E6-only modules before edits; record generic-flow limitation explicitly. | E6 approval and source map. | Passed |
| E6-T02 | Add pure shared deterministic coverage helper only where needed by planner and adaptive start flow. | Preserve coverage order and start/adaptive public DTOs; no unrelated service refactor. | Unit comparisons and existing adaptive/start regression. | Passed |
| E6-T03 | Add planner query validator, service, controller, protected route, injected read limit, and app/router wiring. | Validate before reads; route before `/:id`; exact safe bounded DTO; no provider/write/cache. | Focused unit/integration API, ownership, bounds, no-side-effect, and route-order tests. | Passed |
| E6-T04 | Add strict planner client adapter/parser and reusable preview component. | Reject untrusted DTO; static labelled fallback before any visual enhancement; safe internal handoff only. | Adapter/parser and component recovery/accessibility tests. | Passed |
| E6-T05 | Integrate preview into Practice and Coach shared context without altering start, quota, draft, text/voice, result, or replay behavior. | Current-selection guard, preserved input, context/type compatibility, existing start adapter/idempotency. | Practice/Coach integration and direct regression tests. | Passed |
| E6-T06 | Final audit, documentation, and verification. | Compare every requirement to final diff/tests/runtime evidence; record N/A/deviation; stop on new provider/write/security scope. | Focused tests, affected lint/client build, delivery validation, scoped diff; one browser smoke only if necessary. | Passed |

#### Planning decisions and preventive checks

| Decision / check | Rationale | E6 implementation gate |
| --- | --- | --- |
| `GET /api/interviews/plan` has no idempotency key. | Preview has no side effect; accepting a start-only key would falsely imply session creation semantics. | Do not reuse the start validator verbatim; share only selection rules. |
| Resume selection is ownership-validated but its text is never read by the planner. | Start permits a resume, but preview must remain safe and deterministic without rendering or using extracted resume content. | Use `assertOwnedCompletedResume`, not `getOwnedResumeContext`. |
| Targeted preview uses read-only evidence. | Existing `getOwnedWeakSkill` reaches the mutable profile path used by start. | Use `getReadOnlyProfile`; prove no reconciliation/write occurs. |
| Generic interview types have no invented coverage map. | Current deterministic adaptive coverage exists for Role/Project/targeted modes, not standard DSA/HR/System Design. | Return fixed type/level stages and adaptive notice only. |
| Preview stages are not questions. | E6 expressly prohibits prompt generation and prewriting later questions. | No `prompt`, question text, provider call, or exact future-question claim in DTO/UI. |
| Preview route precedes `/:id`. | Express parameter routes would otherwise capture `plan` as an interview ID. | Add an explicit route-order test. |

#### Implementation and verification record — 2026-10-07

- Added authenticated, rate-limited, read-only `GET /api/interviews/plan`
  before `GET /api/interviews/:id`, with a dedicated strict query validator.
  The route uses owned ready Target, confirmed Project, completed Resume, and
  read-only skill-profile services; it cannot call a provider, reconcile
  evidence, cache, create a session, or write persistence.
- Extracted only Role Simulation and Project Defense deterministic coverage
  order into `interviewCoverageService`; existing adaptive/start tests prove
  retained behavior. Generic plans use fixed labelled stages only.
- Added strict client DTO parsing and one shared accessible preview for Practice
  and Coach. Practice blocks start until its current preview succeeds; retries
  retain selected setup and existing start/idempotency behavior. Coach uses
  constrained type/context selection and only offers a Practice setup link.
- Server focused suites: 3 files / 62 tests passed. Client focused suites: 7
  files / 57 tests passed. Browser smoke not required: deterministic component
  tests exercise preview-only states; no browser-only/deployed behavior changed.
- Final checks passed: server/client lint, client production build,
  `npm run validate:delivery`, and scoped diff check. No P0/P1 finding remains.

#### Approval boundary

Approve E6 only for the deterministic read-only planner API, narrowly shared
coverage extraction, strict client adapter, reusable Coach/Practice preview,
safe setup-link alignment, direct tests, and documentation. Any provider call,
question generation, session write, cache, migration, package, environment,
deployment, commit, or push change stops for separate approval.

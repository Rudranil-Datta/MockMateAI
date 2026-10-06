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

Matrix not created. Await explicit user request.

### E4

Matrix not created. Await explicit user request.

### E5

Matrix not created. Await explicit user request.

### E6

Matrix not created. Await explicit user request.

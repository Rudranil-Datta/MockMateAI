# V2 Implementation Timeline — 15 Working Days

Day 1's decision-complete contracts and verification allocation are recorded in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). Each later day remains separately
approval-gated.

## Status

**Days 1–13 complete; Days 14–15 Partial.** Current evidence, findings, and
approval gates are maintained only in `IMPLEMENTATION_STATUS.md`. This timeline
is not blanket execution approval. Each future day or grouped phase requires
explicit user approval before edits or other state-changing actions.

## Phase 1 — Contracts and Candidate Context

| Day | Planned work                                                                                                             | Deliverable / acceptance boundary                                                                                                | Dependency / stop condition                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Reconcile V2 contracts, current implementation, traceability, acceptance tests, privacy bounds, and compatibility rules. | Approved Day 1 matrices and exact planned API/data/provider/UI contracts; no feature implementation before approval.             | Stop on conflict with V1 security, deployment, budget, or success criteria. |
| 2   | Add owned Job Target persistence, validation, analysis contract, and protected API behavior.                             | A bounded JD can produce a validated saved requirement/skill summary; malformed or failed analysis creates no misleading target. | Requires Day 2 approval and deterministic mock-provider proof.              |
| 3   | Add resume-assisted project drafts, user confirmation, owned Candidate Project persistence, and setup UI foundations.    | Resume-derived suggestions remain unsaved until reviewed; only confirmed facts can be selected for Project Defense.              | Stop on unbounded resume context, invented claims, or ownership ambiguity.  |

## Phase 2 — Adaptive Interview Core

| Day | Planned work                                                                                               | Deliverable / acceptance boundary                                                                                   | Dependency / stop condition                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 4   | Define and validate adaptive decision/provider contracts and session/question metadata.                    | Gemini/mock adapters share one bounded schema; legacy V1 generation remains compatible.                             | Stop if provider-neutrality or existing response contracts require unapproved breaking change. |
| 5   | Implement answer-aware follow-up, clarification, recovery, topic-switch, difficulty, and repetition rules. | Strong, partial, weak, and coverage-gap cases produce observably different valid decisions.                         | No arbitrary tool use, direct AI persistence, or difficulty jumps greater than one level.      |
| 6   | Integrate Job Target weighting and `Role Simulation` with the existing five-question lifecycle.            | Two materially different JDs produce different validated interview focus while preserving idempotency and recovery. | Stop if Job Target deletion/editing can corrupt a saved session.                               |

**Phase 2 gate:** the adaptive engine and Role Simulation must pass focused
service/integration/UI tests before Project Defense begins.

## Phase 3 — Project Defense and Skill Intelligence

| Day | Planned work                                                                                                     | Deliverable / acceptance boundary                                                                                          | Dependency / stop condition                                       |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 7   | Add `Project Defense` setup, confirmed-project snapshot, and opening strategy.                                   | The session uses only owned confirmed project facts and selects a relevant defense category.                               | Stop if unconfirmed/extracted-only facts enter provider context.  |
| 8   | Add claim-aware follow-ups across architecture, technology, data, security, testing, deployment, and trade-offs. | A candidate claim produces a specific bounded challenge and replayable follow-up relationship.                             | Preserve five-question cap and safe failure behavior.             |
| 9   | Persist immutable answer-linked skill evidence and derive deterministic mastery/readiness.                       | Completed V2 answers update the derived profile; one answer cannot be represented as high-confidence mastery.              | Stop on partial-write, duplicate-evidence, or cross-owner risk.   |
| 10  | Add weak-skill recommendation, targeted-practice start, retest, and future adaptation.                           | A detected weakness creates an owned practice path; retest evidence changes later recommendations and relevant interviews. | Reuse interview lifecycle; do not create a second scoring system. |

**Phase 3 gate:** Project Defense, skill evidence, and targeted practice must pass
ownership, malformed-output, duplicate, persistence-failure, and recovery checks.

## Phase 4 — Replay and Mandatory UI Upgrade

| Day | Planned work                                                                                                                        | Deliverable / acceptance boundary                                                               | Dependency / stop condition                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 11  | Add replay timeline, follow-up relationships, tested skills, skill impact, and retest comparison.                                   | A user can identify where a weakness appeared and whether later evidence improved.              | Historical V1 sessions remain readable with honest absence of V2 metadata. |
| 12  | Upgrade onboarding, Job Target/Project workspaces, navigation, setup, and dashboard next-action experience.                         | A first-time user can establish context and understand what to practise next without guidance.  | No decorative feature may replace missing core/error states.               |
| 13  | Upgrade the interview cockpit, feedback, responsive behavior, keyboard flow, reduced motion, 200% zoom, and all async/error states. | The adaptive interview feels focused and premium without becoming a dense dashboard or chatbot. | Text remains the dependable baseline; do not add streaming infrastructure. |

## Phase 5 — Assurance and Release

| Day | Planned work                                                                                                                            | Deliverable / acceptance boundary                                                                                                           | Dependency / stop condition                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 14  | Run focused and cross-cutting tests, compatibility/security/privacy review, affected lints, complete workspace suite, and client build. | Every approved criterion has evidence or a classified finding; no unresolved P0/P1 proceeds to release.                                     | New dependencies, schema migration, or architectural expansion require renewed approval. |
| 15  | Fix approved blockers, reconcile documentation, run at most one approved deployed V2 journey, and prepare demo/rollback handoff.        | Deployed flow proves JD targeting, adaptive follow-up, Project Defense, skill update, targeted practice, and replay within approved bounds. | Deployment/provider calls, commit, and push remain separately approval-gated.            |

## Planned Verification Cadence

- Start each day by replacing the current plan in `IMPLEMENTATION_STATUS.md`
  with approved traceability, verification, risk, and task matrices.
- After a coherent change, run only the narrowest deterministic affected tests.
- Run milestone/full regression only at the Phase 2, Phase 3, and Day 14/15
  gates or when a shared security/schema/provider boundary changes.
- Use mock providers for routine work. Permit at most one bounded configured-
  provider smoke after relevant provider/configuration change and explicit
  approval.
- End every day with evidence, deviations, unresolved findings, manual tasks,
  and `Complete`, `Partial`, or `Blocked` status. Do not begin the next day or
  phase without explicit approval.

## Approved Deferrals

Knowledge-graph visualization, standalone Story Bank, live copilot, peer/video
interviews, body-language scoring, coding sandbox, scraping, payments,
placement integration, advanced gamification, and distributed infrastructure
are not part of this timeline.

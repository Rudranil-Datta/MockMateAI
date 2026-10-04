# V2 Implementation Plan — Adaptive Interview Preparation

## Status and Authority

**Status:** Days 1–3 complete — implementation in progress; Day 4 unapproved.

This plan extends the completed V1 demo/staging baseline. It does not authorize
application code changes, dependencies, provider calls, deployments, commits,
or pushes. Each V2 day or approved phase requires separate user approval and a
current traceability/verification matrix in `IMPLEMENTATION_STATUS.md` before
state-changing work begins.

Authority order remains:

1. Explicit user approval for the current V2 day or phase.
2. `V2_SUCCESS_CRITERIA.md` and `V2_IMPLEMENTATION_TIMELINE.md`.
3. This implementation plan and affected shared design contracts.
4. `DELIVERY_ASSURANCE.md` and the live `IMPLEMENTATION_STATUS.md` record.

Day 1 resolved the exact fields, bounds, lifecycle, compatibility, formulas,
UI states, security limits, and verification allocation in
[`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). That contract governs Days 2–15;
changing it is a documented deviation requiring approval.

## Product Goal

Turn MockMateAI from a question-and-score flow into a bounded adaptive
preparation system:

```text
Resume + confirmed project + job description
                    ↓
Candidate and role context
                    ↓
Adaptive interview / project defense
                    ↓
Persisted skill evidence
                    ↓
Targeted practice and retest
                    ↓
Replay, comparison, and future adaptation
```

The user must be able to see that job requirements, confirmed project facts,
and previous performance materially affect later questions and recommendations.

## Approved Cohesive-Core Scope

### 1. Job Targets and role simulation

- Let an authenticated user save a bounded job title, optional company, and job
  description.
- Extract a validated requirement/skill summary through the provider-neutral AI
  boundary. Never scrape employer sites or claim proprietary company questions.
- Add `Role Simulation` as a supported interview type. It requires an owned Job
  Target and uses its confirmed requirement snapshot to allocate interview
  coverage.

### 2. Confirmed candidate projects and Project Defense

- Produce bounded project drafts from an owned completed resume extraction.
- Treat extracted projects as suggestions only. Do not persist or use them until
  the user reviews and confirms the facts.
- Add `Project Defense` as a supported interview type. It requires an owned,
  confirmed Candidate Project and probes architecture, technology choices,
  APIs, data, security, testing, deployment, trade-offs, failure scenarios, and
  explicitly claimed results.

### 3. Bounded adaptive interview engine

- Keep the five-question session limit and one answer per question.
- Use a provider-neutral structured decision for each new question: prompt,
  topic, tested skills, difficulty, decision type, and safe reason code.
- Strong evidence may deepen difficulty; partial evidence requests
  clarification; weak evidence permits one focused probe or recovery question;
  coverage gaps trigger a topic switch.
- Difficulty changes by at most one level between adjacent questions. The
  backend validates all decisions, prevents repetition, and remains authoritative
  for ownership, state transitions, idempotency, persistence, limits, and scores.
- This is not autonomous agent or multi-agent orchestration. AI cannot invoke
  arbitrary tools, query the database directly, or commit state.

### 4. Persistent skill intelligence and targeted practice

- Save immutable, answer-linked skill evidence with validated categorical
  outcomes rather than accepting an LLM-assigned mastery score.
- Derive mastery deterministically from recent evidence. Map `strong`,
  `partial`, `weak`, and `missing` to fixed evidence values; weight by bounded
  difficulty, evidence strength, and recency; show a provisional label until
  enough attempts exist.
- Generate a targeted-practice session from an owned weak skill by reusing the
  existing interview lifecycle with `sessionPurpose=targeted_practice` and one
  validated `focusSkillKey`.
- Feed completed retest evidence into later mastery and adaptive questioning.

### 5. Replay, improvement, and mandatory UI upgrade

- Replay the question/follow-up chain with answers, feedback, tested skills,
  difficulty, and safe decision labels.
- Compare earlier evidence with retest evidence without rewriting historical
  results.
- Add goal-based onboarding, Job Target and Project workspaces, an upgraded
  practice setup, a distraction-free interview cockpit, evidence-focused
  feedback, and a personalized dashboard with the next recommended action.
- Preserve text as the dependable baseline, constrained voice support, mobile
  usability, keyboard access, reduced motion, 200% zoom, and complete loading,
  empty, error, retry, and preserved-draft states.

## Planned Architecture and Interfaces

### Persistence

Add owned MongoDB collections for `jobTargets`, `candidateProjects`, and
`skillEvidence`. Extend `interviewSessions` additively with the two new interview
types, session purpose, owned context references/snapshots, and bounded question
decision metadata. Existing V1 records need no backfill; missing V2 fields use
legacy-compatible defaults.

Saved interview snapshots contain only the bounded confirmed requirements or
project facts needed for reproducible replay. Editing or deleting a source Job
Target/Project must not corrupt an existing session.

### API surface

Planned protected resources:

- `/api/job-targets` and `/api/job-targets/:id` for owned CRUD.
- `/api/projects/extract` for unsaved, resume-assisted drafts.
- `/api/projects` and `/api/projects/:id` for owned confirmed-project CRUD.
- `/api/skills/profile` for derived mastery, evidence confidence, weak skills,
  and recommended next action.
- Existing `/api/interviews` accepts the new interview types and optional
  `jobTargetId`, `projectId`, `sessionPurpose`, and `focusSkillKey` fields.

All request and provider outputs remain strictly validated. Cross-owner and
invalid references return safe errors. Duplicate costly actions retain the V1
idempotency/claim pattern.

### Provider boundary

Gemini and mock adapters will implement the same extended structured contracts
for Job Target analysis, project-draft extraction, adaptive question decisions,
and skill-evidence evaluation. Provider output proposes content and evidence;
feature services validate it and deterministic backend code decides what may be
saved or used.

Use only the current question/answer, previous bounded question summaries,
confirmed Job Target/Project context, and the smallest relevant skill summary.
Do not send an entire interview history, unrelated resume content, or another
user's data.

## Failure and Safety Requirements

- Preserve setup selections and answer drafts across provider/network failure.
- Reject malformed, unbounded, unsupported, or context-inventing AI output
  before persistence or rendering.
- Never convert an unconfirmed project draft into interview context.
- Keep quota, timeout, retry, upload, and duplicate-request controls finite and
  compatible with the V1 deployment topology.
- Log only safe decision categories and identifiers. Never log chain-of-thought,
  prompts, provider payloads, JD/resume/project text, answers, secrets, or DB
  topology.
- If skill-evidence persistence fails, do not claim mastery changed. Preserve the
  completed answer/feedback and expose a truthful recoverable synchronization
  state defined during the owning implementation day.

## Deferred Scope

- Visual knowledge/skill graph.
- Standalone STAR Story Bank.
- Live interview copilot or covert real-interview assistance.
- Peer matching, multi-user/video interviews, body-language or emotion scoring.
- Executable coding sandbox, proctoring, anti-cheating, payments, recruiting,
  employer scraping, and placement-platform integration.
- Microservices, queues, graph databases, distributed systems, or autonomous
  agent/multi-agent orchestration.

## Risks and Controls

| Risk                             | Required control                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AI invents a project claim       | Drafts require explicit user confirmation; prompts and validators restrict use to confirmed facts.                       |
| One answer distorts mastery      | Store categorical evidence and derive bounded, confidence-labelled mastery deterministically.                            |
| Adaptive loop repeats or wanders | Five-question cap, allowed decision enum, one-step difficulty change, coverage plan, and repetition checks.              |
| New data leaks across users      | Derive `userId` from auth and include it in every Job Target, Project, evidence, and session query.                      |
| Provider cost expands            | Minimum context, existing rate limits, deterministic mocks, finite timeouts/retries, and separately approved live smoke. |
| V2 breaks V1                     | Additive schemas/contracts, legacy defaults, focused compatibility tests, and full milestone regression before release.  |
| Fifteen-day scope expands        | Defer optional graph/story/live features and stop for explicit approval on any replacement or material deviation.        |

## Completion and Approval Gates

- A day or phase starts only after explicit user approval of its current
  traceability and verification matrices.
- New dependencies, migrations, external account changes, live provider calls,
  deployment, destructive cleanup, commits, and pushes require explicit scope
  authorization even when a feature day is otherwise approved.
- Mark V2 complete only when every non-deferred criterion in
  `V2_SUCCESS_CRITERIA.md` has independent evidence, affected documentation
  matches behavior, and no unresolved P0/P1 finding remains.

## Deviations From the Submitted Proposal

- Replace the proposed adaptive “agent” and tool calls with a bounded service
  and provider contracts to preserve the canonical no-agent rule.
- Use MongoDB collections/documents rather than relational or graph tables.
- Add a confirmed Candidate Project store because V1 has no structured project
  records; resume extraction supplies drafts, not facts.
- Defer the visual knowledge graph, broad role catalogue, advanced animations,
  and sophisticated graph relationships to protect the 15-working-day release.
- Replace the illustrative `70/30` LLM-influenced mastery update with
  deterministic evidence aggregation.
- Replace tool/reason or chain-of-thought logging with safe reason codes.
- Include the earlier Job Target workspace and answer/retest comparison ideas;
  defer the standalone Story Bank.

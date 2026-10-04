# V2 Success Criteria — Adaptive Interview Preparation

Exact acceptance bounds and the Days 2–15 independent verification allocation
are frozen in [`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). These criteria
remain the product outcomes; the Day 1 contract defines how they are measured.

## Release Goal

V2 succeeds when the platform demonstrably learns from bounded, validated
candidate evidence and uses it to adapt later interview preparation. More
screens or AI calls alone do not satisfy V2.

## Complete User Journey

An authenticated user can:

1. Create a Job Target from a bounded job description.
2. Review and confirm a resume-assisted Candidate Project draft.
3. complete a Role Simulation whose coverage reflects the Job Target;
4. complete a Project Defense whose follow-ups challenge confirmed project
   facts and the user's current answers;
5. see persisted skill evidence and an honestly confidence-labelled profile;
6. start targeted practice for a detected weakness and complete a retest;
7. see the new evidence influence later recommendations/interviews; and
8. replay the question, answer, feedback, follow-up, and skill-impact timeline.

## Functional Acceptance Criteria

| Area                 | Required observable behavior                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job Target           | Changing the confirmed JD changes prioritized skills and the Role Simulation question distribution.                                                   |
| Project intake       | Resume extraction returns editable drafts; no draft becomes interview context until explicitly confirmed.                                             |
| Role Simulation      | The new type requires an owned Job Target and remains within the bounded five-question lifecycle.                                                     |
| Project Defense      | The new type requires an owned confirmed project and asks a meaningful claim-, architecture-, or trade-off-specific follow-up.                        |
| Adaptation           | Strong, partial, weak, and coverage-gap evidence produce different allowed next-question decisions without repetition or unbounded difficulty change. |
| Skill intelligence   | Every mastery value is reproducible from persisted categorical evidence; the LLM never writes final mastery directly.                                 |
| Targeted practice    | A weak skill produces a focused practice session; completed retest evidence changes the derived profile and relevant later preparation.               |
| Replay               | A user can inspect ordered questions, answers, feedback, difficulty, safe decision type, tested skills, and retest comparison.                        |
| Compatibility        | Existing DSA, HR, System Design, resume, text, voice, feedback, completion, and dashboard journeys continue to work.                                  |
| Provider portability | Gemini and mock adapters satisfy the same V2 structured contracts; feature services contain no provider-specific SDK logic.                           |

## UI and Usability Criteria

- Goal-based onboarding explains Job Targets, confirmed Projects, interview
  types, and the next recommended action without requiring a guide.
- The interview cockpit prioritizes the question and response, shows topic,
  difficulty, progress, and follow-up state, and does not expose internal
  reasoning or overload the user with analytics.
- Feedback identifies the tested skill, evidence, one priority improvement, and
  an actionable practice/retest path.
- Dashboard mastery is confidence-labelled and never implies hiring certainty.
- Every new screen has usable success, loading, empty, validation, dependency
  failure, persistence failure, retry, and preserved-draft behavior.
- Keyboard navigation, focus visibility, semantic labels/live regions, contrast,
  reduced motion, mobile layout, and 200% zoom remain usable.

## Security, Privacy, and Reliability Criteria

- Authentication supplies `userId`; every protected Job Target, Project,
  evidence, and session query enforces ownership.
- JD, resume, project, answer, prompt, provider payload, and chain-of-thought
  content are excluded from operational logs.
- Provider inputs use the minimum relevant bounded context, and outputs are
  schema/range/enum validated before persistence or rendering.
- Invalid IDs, cross-owner references, malformed output, duplicate/concurrent
  operations, provider timeout/quota/failure, persistence failure, and
  interrupted sessions remain safe and recoverable.
- Existing AI/upload/rate/body/session caps remain enforced. New costly actions
  receive explicit finite bounds and idempotency where applicable.
- Historical V1 sessions remain readable without data migration or fabricated
  V2 metadata.

## Release Evidence

- Deterministic service/integration/component tests cover the success and
  negative behavior above.
- Phase gates and the final release include the proportionate regression,
  lint/build, documentation, and diff evidence required by
  `DELIVERY_ASSURANCE.md`.
- One bounded deployed V2 smoke is permitted only with explicit approval after
  deterministic checks pass. It uses synthetic data and reports safe metadata.
- V2 is `Complete` only when every required criterion has evidence, all affected
  documents match behavior, and no unresolved P0/P1 remains.

## Explicitly Deferred

The V2 release does not depend on a visual knowledge graph, STAR Story Bank,
live copilot, peer or multi-user interviews, body-language/emotion scoring,
coding sandbox, scraping, payments, recruiting, placement integration,
microservices, queues, graph databases, or autonomous agent orchestration.

# V1 Task Board

## Day 1 — Complete

| Task | Owner | Dependency | Evidence |
| --- | --- | --- | --- |
| Confirm scope and V1 boundary | Team | Project documents | Core flow/non-goals confirmed. |
| Confirm architecture and contracts | Team | Project documents | Modular monolith confirmed. |
| Initialize Git | Codex | User approval | Empty Git repository created. |
| Select local tooling | Team | Installed runtime check | Decisions recorded in `TECHNICAL_DECISIONS.md`. |
| Prepare Day 2 work | Team | Day 1 decisions | Tickets below. |

## Day 2 — Awaiting Approval

| Task | Dependency | Acceptance check |
| --- | --- | --- |
| Create React/Vite client | Node/npm | Client starts locally. |
| Create Express server | Node/npm | Server starts and exposes health route placeholder. |
| Add root configuration | Client/server structure | `.gitignore`, README, npm scripts, environment examples exist. |
| Add baseline lint/format/test setup | Client/server packages | Relevant checks run locally. |

## Planned AI reliability work

| Task | Timeline | Acceptance check |
| --- | --- | --- |
| Provider-neutral contract with Gemini/mock adapters | Day 13 | Shared contract tests pass; provider specifics stay inside adapters. |
| Gemini evaluation and quota error mapping | Day 18 | `AI_QUOTA_EXCEEDED` preserves work and returns safe API response. |
| Quota limits, cache, and active-user notification | Day 29 | Simulated quota exhaustion shows in-app notice and safe log without key rotation. |

## Current risks

- MongoDB Atlas and Gemini API access are user-managed prerequisites for live integration. OpenAI access is optional future work, not a V1 prerequisite.
- Documentation now lives in `project_memory/`; implementation rules must use this location.

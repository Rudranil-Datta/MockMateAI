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

## Current risks

- MongoDB Atlas and OpenAI access are user-managed prerequisites for live integration.
- Documentation now lives in `project_memory/`; implementation rules must use this location.

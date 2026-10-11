# MockMateAI Project Report Guide

## Project Gist

MockMateAI is a React, Node/Express, and MongoDB interview-preparation
application. It supports authenticated DSA, HR, System Design, Role Simulation,
and Project Defense practice; typed answers are the dependable baseline, with
bounded voice support. The backend alone calls Gemini through a provider-neutral
adapter boundary. It validates provider output before rendering or persistence,
keeps ownership checks at protected data boundaries, preserves drafts on failure,
and stores feedback, completed sessions, and safe analytics.

V2 extends V1 with saved Job Targets, user-confirmed Candidate Projects,
deterministic bounded adaptation, immutable skill evidence, targeted practice,
retest comparison, replay, Coach, Knowledge Tree, and Interview Planner. It is
not an autonomous agent: services control state, limits, validation, and all
side effects.

## Documentation Authority

Use these documents for an academic submission. Read them in this order.

1. `PROJECT_CONTEXT.md` — problem statement, objectives, scope, modules,
   benefits, and technology stack.
2. `SYSTEM_ARCHITECTURE_AND_DESIGN.md` — architecture, components, provider
   boundary, data design, V1/V2 scope, and requirement traceability.
3. `DATA_FLOW.md` — end-to-end flows, validation, error/retry, privacy, and V2
   data movement.
4. `DATABASE_DESIGN.md` — collections, ownership, validation, indexes,
   retention, and V2 additions.
5. `API_DESIGN.md` — public API contracts, response/error shapes, auth, limits,
   and V2 endpoints.
6. `UI_DESIGN.md` — information architecture, screens, interaction states,
   accessibility, responsive behavior, and V2 UI additions.
7. `SECURITY_&_DEPLOYMENT.md` — security model, configuration categories,
   upload safety, provider controls, deployment, and operational limits.
8. `TECHNICAL_DECISIONS.md` — rationale for provider, upload, transcription,
   retry, hosting, and V2 design decisions.
9. `SUCCESS_CRITERIA.md`, `V2_SUCCESS_CRITERIA.md` — acceptance criteria and
   release evidence requirements.
10. `IMPLEMENTATION_STATUS.md` — only source for live progress, completed-work
    evidence, open findings, limitations, and current status.

## Planning and Evidence Use

- `IMPLEMENTATION_TIMELINE.md` and `V2_IMPLEMENTATION_TIMELINE.md`: approved
  delivery sequence. They are plans, not proof of completion.
- `V2_IMPLEMENTATION_PLAN.md` and `V2_DAY1_CONTRACTS.md`: V2 scope, contracts,
  bounds, compatibility rules, and approval gates.
- `V2_EXTENSION.md` and `UPGRADE.md`: approved UI-extension scope and detailed
  E1–E6 implementation evidence.
- `REMEDIATION1.md`: current remediation/audit record. Cite open gaps exactly;
  do not present planned or partial work as complete.
- `V1_REMEDIATION_PLAN.md`: historical V1 audit plan and evidence context.
- `DELIVERY_ASSURANCE.md`: delivery and verification governance, not product
  behavior.

## Academic Report Outline

1. Introduction and problem: `PROJECT_CONTEXT.md`.
2. Requirements and scope: `PROJECT_CONTEXT.md`, success criteria, and V2 plan.
3. Architecture and technologies: architecture, folder structure, and technical
   decisions.
4. Design: database, API, data flow, and UI design.
5. Security, privacy, and reliability: security/deployment, data flow, API, and
   technical decisions.
6. Implementation and V2 innovations: V2 plan/contracts, extension, and upgrade
   evidence.
7. Testing and evaluation: implementation status and success criteria; report
   only recorded commands/results and unresolved limitations.
8. Limitations and future work: deferred scope in success criteria/V2 plan plus
   unresolved items in implementation status/remediation record.

## Retained vs Removed Documentation

Retained documents are either authoritative specifications, live evidence,
contracts, architectural records, or explicit remediation history. The former
`Day 11 - 13 UI.md`, `Day 11.md`, `Day 12.md`, and `Day 13.md` files duplicated
superseded planning/execution detail. Their durable V2 UI scope and evidence are
consolidated in `V2_EXTENSION.md`, `UPGRADE.md`, and
`IMPLEMENTATION_STATUS.md`.

# Daily Task Planning, Risk Control, and User Approval

- Read `project_memory/IMPLEMENTATION_STATUS.md` first; confirm its current day and status.
- Before each workday, split the approved day into small independently verifiable tasks. Before each task, record objective/affected area, expected result, dependencies, issues/risks, mitigation/validation, and potential documentation deviation in `project_memory/IMPLEMENTATION_STATUS.md`.
- Each task needs explicit user approval before edits, dependency installation, deployment, external communication, or another state-changing action. Targeted read-only inspection to prepare the plan is allowed.
- Explicit automation permission (for example, “implement approved Day N automatically”) waives per-task approval only for the stated scope/duration. Name prior approval before continuing a partial task. One approval does not authorize unrelated work, scope expansion, destructive action, deployment, or external accounts.
- If a task is unapproved, present its concise task/risk/mitigation/deviation plan and wait. Never infer approval from general discussion.
- Stop for renewed approval on material deviation, security/privacy risk, dependency, migration, destructive action, significant cost, or scope expansion.
- Maintain concise task status/blockers/evidence in `project_memory/IMPLEMENTATION_STATUS.md`. End each day with a cumulative dated outcome, validation evidence, unresolved issues, and `Complete`, `Partial`, or `Blocked`. Never call unapproved, untested, partial, or blocked work complete.
- Every daily report must include a **Manual tasks for user** section. List each user-owned action, why it is needed, and short ordered steps to complete it.
- If no manual action is required, explicitly state: `Manual tasks for user: None.`
- Never request secrets in chat. For credentials, state where the user should configure them and identify the relevant environment-variable name without asking them to disclose its value.

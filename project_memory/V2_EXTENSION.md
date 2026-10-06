# V2 Extension E1–E6 — Midnight Prism Coach and Evidence UI

## Authority and approval boundary

This document is the source of truth for the V2 extension scope. It inserts Extension E1–E6 before existing V2 Days 14–15. It does not approve source implementation, dependency installation, provider calls, migration, deployment, commit, or push. Each extension day needs its own approved traceability, verification, risk-remediation, and task matrices before edits begin.

The extension preserves the modular monolith, V1/V2 compatibility, data isolation, deterministic adaptive engine, five-question cap, and evidence/privacy rules. It is an evidence-backed Coach, not an autonomous agent: it does not browse, schedule, invoke tools, make hidden writes, or make hiring claims.

## Extension outcome

Deliver a sophisticated, responsive Midnight Prism interface plus an owned, deterministic Coach connecting preparation context, skills, evidence, replay, targeted practice, and a bounded pre-interview preview.

The Coach supports three user-selected contexts:

- **Overall preparation**, derived from the owned skill profile.
- **Job Target**, derived from an owned ready Job Target.
- **Project Defense**, derived from an owned confirmed Candidate Project.

Overall preparation is the default. Job Target and Project contexts require an explicit selection; no context is silently chosen.

## Shared visual direction

### Midnight Prism design system

- Dark ink canvas `#080D1A`, shell `#0D1426`, raised surface `#121C31`, and hover surface `#172542` replace white-first application surfaces.
- Cobalt `#6D7CFF` identifies primary actions and active paths; violet `#A78BFA` identifies planning and preparation intelligence.
- Teal `#2DD4BF` identifies progress, saved evidence, readiness, and success; amber `#FBBF24` identifies priority improvements and attention; coral `#FB7185` is reserved for destructive and error states.
- Near-white headings, muted blue-grey body text, semantic chips, visible focus, and contrast-safe borders preserve professional readability. Colour never carries meaning alone; text, icon, and semantic labels remain present.
- Every E1–E6 client surface consumes shared semantic CSS custom properties. Do not retain hardcoded white/blue application surfaces when an equivalent shared token exists.

Use consistent surface/elevation tiers and a clear type scale. Motion is expressive but purposeful: 120ms press feedback, 160–200ms controls/cards/navigation, 240ms section entry, and up to 400ms chart/progress reveal. Allow staggered entry for at most six visible cards, chart/progress transitions, loading shimmer, and brief success/error feedback. Do not add decorative infinite motion, animation packages, or behavior-changing animation state. Disable nonessential motion under `prefers-reduced-motion`.

### Responsive baseline

- Desktop keeps the existing 240px rail only while remaining content fits.
- Main content and every grid child shrink safely and never create horizontal page scrolling.
- Targets and Projects use two columns only above their available-width threshold; below it, forms and saved-resource lists stack.
- Mobile keeps the accessible navigation drawer and one-column content.
- Changed controls remain at least 44px, keyboard reachable, visibly focused, usable at 320px and 200% zoom, and labelled beyond colour.

## Extension days

### E1 — Visual foundation and responsive remediation

Implement Midnight Prism tokens and reusable visual primitives across existing shared controls and current client surfaces: shell, navigation, cards, forms, alerts, chips, Dashboard, Practice, Targets, Projects, Skills, Resumes, and shared result primitives. Add professional elevation and bounded CSS-first motion without changing content hierarchy, lifecycle, or data behavior. Correct desktop horizontal overflow beside the rail, including workspace-grid shrink/reflow. Do not hide overflow as a substitute for fixing width constraints. E1 completes only after one focused browser smoke verifies desktop rail, Dashboard/Practice/Targets/Projects, 320px, 200% zoom, keyboard focus, reduced motion, and no horizontal page scroll.

### E2 — Dashboard and preparation workspaces

Recompose Dashboard into a preparation home with Coach entry, exactly one next action, confidence-labelled skill snapshot, and safe recent evidence/replay access.

Upgrade Job Targets with analysis cards: role summary, requirement priority, weighted skills, readiness state, edit, reanalyse/retry, delete, and Role Simulation entry. Raw job descriptions are available only during explicit edit.

Upgrade Projects with confirmed-fact status, preparation context, clear edit/delete actions, and retained messaging that extracted suggestions are not facts. Apply shared UI states to Dashboard, Targets, Projects, Skills, Resumes, and navigation: loading, empty, error, retry, and preserved drafts.

Use Midnight Prism tokens and the shared interaction system; add no new palette, motion framework, or unlabelled colour-only state.

### E3 — Practice, feedback, and replay polish

Apply the design system to Practice setup, active cockpit, in-place feedback, and completed replay/result. Preserve one dominant interview action, dependable text answering, constrained voice, existing recovery, and V1 rendering.

Improve hierarchy for drafts, loading, quota, failure, retry, completion, and evidence-sync states without inventing progress or changing lifecycle behavior.

Use Midnight Prism tokens and shared motion only to clarify existing interview state; never animate fabricated progress or conceal an error/retry state.

### E4 — Evidence-backed Coach and roadmap

Add an owned protected read-only API: GET /api/coach/roadmap.

It returns the selected safe context label, evidence-sync status, bounded skill summaries, and three to five deterministic roadmap actions with safe app links. It accepts explicit Overall, Job Target, or Project Defense context selection and validates owned context identifiers.

Actions are limited to adding context, confirming a project, collecting evidence through practice, starting targeted practice, retesting, or reviewing replay. Ranking is deterministic:

- Overall uses the existing recommended weak/non-established skill.
- Job Target uses target skill weight, then evidence/mastery/confidence.
- Project Defense uses confirmed coverage categories with insufficient or weak evidence.

No response exposes raw answers, provider payloads, hidden reasoning, source text, private evidence, or a hiring/readiness guarantee. The Coach provides honest loading, empty, pending-sync, unavailable-context, malformed-response, and retry states.

Coach surfaces consume Midnight Prism planning, evidence, attention, and error semantics while retaining text labels and reduced-motion behavior.

### E5 — Knowledge tree

Add a safe, bounded Coach knowledge tree:

    Selected preparation context
            ↓
    Requirements or confirmed coverage categories
            ↓
    Tested skills
            ↓
    Mastery, confidence, evidence count, and safe replay links

Nodes and edges derive server-side from owned records. Do not add a graph database, migration, or visualization package. Provide an accessible ordered-list fallback first and a responsive CSS/SVG tree enhancement on wider screens. Clearly label no evidence, provisional, emerging, and established. Bound nodes and links; summarize omitted lower-priority items honestly.

Tree surfaces use Midnight Prism tokens and bounded reveal motion only after ordered-list content is available without motion.

### E6 — Bounded interview planner and Coach integration

Add an owned protected read-only API: GET /api/interviews/plan.

It accepts the same validated selection combination as interview start: interview type, level, optional owned ready Job Target or confirmed Project, and optional valid targeted-practice focus. It returns only a safe preview: five-question maximum, opening focus, intended coverage/progression stages, and evidence-based rationale. It states later questions adapt to answers and are not prewritten.

Reuse existing deterministic coverage/adaptive rules. The preview must not generate prompts, invoke Gemini, persist a plan, or alter start/interview contracts. Coach and Practice show the preview before start; the user can adjust context, level, or focus, then begin the existing interview flow. Roadmap actions link to appropriate Practice setup while retaining ownership, quota, draft, validation, and retry behavior.

Planner preview uses Midnight Prism planning/progress semantics and bounded state transitions without implying questions are generated or readiness is guaranteed.

## Interface, safety, and compatibility rules

- Both new APIs derive userId from authentication, validate inputs, use owned-resource queries, and make missing/foreign context indistinguishable.
- Coach and planner are read-only. E1–E6 add no persistence, migration, graph store, provider, environment variable, package, external integration, or deployment configuration.
- Existing Gemini-backed Job Target analysis, question generation, answer evaluation, and transcription remain unchanged. Coach, tree, roadmap, and planner use saved data and deterministic services, not new Gemini calls.
- Existing skill-evidence formula, confidence rules, immutable snapshots, replay privacy boundary, and no-hiring-claim rule remain authoritative.
- Existing DSA, HR, System Design, resume, text, voice, feedback, completion, targeted-practice, Role Simulation, Project Defense, and historical result journeys remain compatible.

## Verification and handoff sequence

Each extension day runs focused deterministic tests for changed behavior plus affected lint/build checks. Its matrices define exact cases before implementation.

- **E1:** semantic token consumption across affected surfaces; motion-duration/pressed/reduced-motion review; overflow/reflow; one focused browser smoke covering desktop rail, Dashboard/Practice/Targets/Projects, 320px, 200% zoom, keyboard focus, and reduced motion.
- **E2–E3:** workspace/dashboard/practice/result success, empty, malformed, draft, retry, and V1 regression cases.
- **E4–E6:** API validation, ownership, safe serialization, pending-evidence recovery, deterministic action/plan ordering, and client fallback rendering.

Existing V2 **Day 14** follows E6 as cross-cutting assurance: full workspace suite, compatibility/security/privacy review, lint/build, delivery validation, and one focused browser smoke only if BrowserAct is activated.

Existing V2 **Day 15** follows Day 14: fix only approved findings, reconcile documentation, run at most one separately approved deployed V2 journey, then prepare demo and rollback handoff. Deployment, provider calls, commit, and push retain separate approval gates.

## Explicit exclusions

This extension does not add LangChain, autonomous or multi-agent orchestration, live copilot, coding sandbox, video, external browsing, scraped question banks, advanced gamification, payments, recruiting/placement features, graph database, or distributed infrastructure.

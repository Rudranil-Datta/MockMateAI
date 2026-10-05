# V2 Days 11–13: Calm Premium UI Upgrade

## Design direction

A polished, light professional workspace: deep ink typography, soft slate canvas, white elevated surfaces, cobalt primary actions, teal positive evidence, and restrained amber for attention. Use existing Inter, Lucide icons, CSS, and responsive primitives—no new dependencies, raster assets, dashboard framework, or chat/streaming UI.

Desktop uses a 240px left rail; mobile uses a compact header plus accessible navigation drawer. Motion stays subtle: fast opacity/position transitions only, disabled under reduced motion.

Reference cues: Aced makes interview track selection and practice entry immediate; interviewing.io centers actionable post-session feedback; Linear pairs clear work hierarchy with personalized insight surfaces. Use those patterns, not their content or brand language. [Aced Practice](https://www.tryexponent.com/practice), [interviewing.io](https://interviewing.io/), [Linear Plan](https://linear.app/plan)

## Day 11 — Replay and improvement story

- Upgrade result screen into an ordered replay timeline: question number, topic, difficulty, safe decision label, tested skills, answer, feedback, and visible parent/follow-up connector.
- Label Role Simulation and Project Defense snapshots as saved context; source edit/deletion never changes replay.
- Add additive V2-only `retestComparison` to owned session reads when evidence synchronization is ready:
  `{skillKey, skillLabel, previousMasteryScore, currentMasteryScore, previousConfidence, currentConfidence}`.
  It derives only deterministic owned evidence, exposes no raw evidence/provider data, and uses “limited evidence” wording for provisional confidence.
- If comparison is unavailable or pending, show an honest saved-retest state with no invented delta. Historical V1 results retain current readable result layout with “No adaptive metadata recorded.”
- Tests: V2 chain ordering/parent links, targeted score comparison, pending/absent comparison, legacy fallback, safe serialization, foreign ownership, and source-deletion stability.

## Day 12 — Workspace, onboarding, dashboard

- Replace top navigation with adaptive rail: Dashboard, Practice, Targets, Projects, Skills, Resumes; profile/logout anchored below. Mobile preserves all routes through an accessible drawer.
- Add first-use “Preparation setup” guidance based on existing owned resources: add Job Target, confirm Project, practise, review. It is a clear progression, not gamification.
- Upgrade dashboard into three purposeful regions:
  1. readiness hero with exactly one recommended action;
  2. confidence-labelled skill cards and low-pressure trend context;
  3. recent-session/replay access.
- Add `/targets` and `/skills` workspaces. Targets use existing owned APIs; Skills uses `GET /api/skills/profile`, with mastery, confidence, evidence count, last-practised date, and a focused-practice entry point.
- Upgrade Practice setup into guided selection: interview type, level, optional resume, conditional Target/Project, and server-derived weak-skill focus. Extend client `startInterview` input only for existing Day 10 fields: `sessionPurpose` and `focusSkillKey`.
- Tests: first-use/empty/loading/error/retry states, target/project/skill ownership-safe rendering, targeted-practice handoff, mobile rail/drawer, and preserved setup drafts.

## Day 13 — Interview cockpit and feedback

- Rebuild active practice as a distraction-free cockpit: compact progress rail, one prominent question card, topic/difficulty/safe follow-up labels, answer editor, constrained voice control, and a clear next/complete action.
- Keep feedback in-place after submission: score summary, one priority improvement, tested-skill context, then deliberate continuation. No hidden reasoning, provider payload, chat simulation, or dense analytics.
- Upgrade completed feedback/result hierarchy to match replay visual system.
- Require 44px controls, visual focus, polite live status, keyboard-first flow, 320px reflow, 200% zoom, contrast, and reduced-motion fallback.
- Tests: question/feedback/action state transitions, loading/quota/provider/persistence retry states, focus movement, keyboard navigation, reduced motion, responsive layout, and one focused browser smoke after BrowserAct activation.

## Boundaries and assumptions

- Existing backend contracts remain authoritative. Day 11’s additive comparison is the only new read field; Days 12–13 are client-led.
- No UI may claim hiring likelihood or rewrite historical evidence.
- No new dependency, deployment, migration, provider call, or browser test is included until separately approved.
- BrowserAct is installed but external browser research is blocked until its API key is activated. Manual task: complete [BrowserAct registration](https://www.browseract.com/quick-register?session=c16bb5709f864c698af3443f50f87138); then I will use it for one focused rendered-reference pass and Day 13 smoke. A reusable BrowserAct scraping skill is not created: this is multi-source design research, not a recurring single-site automation.

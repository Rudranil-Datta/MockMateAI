<div align="center">
  <img src="client/public/logo.png" width="180" alt="MockMateAI learning assistant logo" />

# MockMateAI

**AI-assisted interview practice that turns each answer into a clearer next step.**

Practice for DSA, HR, System Design, role-specific interviews, and project defenses in one focused workspace.

[Open the live demo](https://mockmateai-web-rudranil-datta.onrender.com) · [Run locally](#run-locally) · [Explore the workflow](#how-it-works)
</div>

---

## Make interview practice measurable

MockMateAI is a full-stack interview-preparation platform for students and early-career professionals. It provides structured practice, evidence-based feedback, and focused follow-up guidance—without presenting AI feedback as a hiring decision.

| Practice with purpose                                                           | Learn from evidence                                                                                | Keep control                                                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Choose a core interview track, level, Job Target, or confirmed project context. | Review structured feedback, saved sessions, skill evidence, replay, and next-step recommendations. | Your data is owner-scoped; project facts are used only after your explicit confirmation. |

## What you can do

- **Start a focused interview.** Practise DSA, HR, System Design, Role Simulation, or Project Defense with a bounded session flow.
- **Answer your way.** Use dependable text input or supported short voice input, then receive structured feedback with practical improvement guidance.
- **Prepare in context.** Save a Job Target, review resume-assisted project drafts, and explicitly confirm the facts that may shape contextual practice.
- **See a useful next step.** Use the dashboard, preparation coach, targeted practice, and session planner to choose what to practise next.
- **Build a learning record.** Return to completed sessions, feedback, replay timelines, and derived skill evidence without losing the dependable text-first flow.

## How it works

1. Create an account and select an interview type and level.
2. Optionally add a Job Target or confirm project facts for relevant contextual practice.
3. Respond to a bounded set of interview questions.
4. Review clear feedback, tested skills, and one practical next action.
5. Revisit saved results and use the dashboard to plan the next session.

## Built with responsible AI boundaries

MockMateAI treats AI as a controlled learning assistant—not an autonomous decision-maker.

- Gemini is called only by the backend through a provider-neutral adapter boundary.
- Requests and provider output are validated before data is saved or rendered.
- Sensitive credentials never reach the browser; protected data access is scoped to the signed-in user.
- Resume-assisted project drafts stay editable and do not become interview context until the user confirms them.
- Skill mastery is derived from stored categorical evidence rather than written directly by an AI model.
- Failures preserve valid work and provide a safe retry or recovery path where supported.

## Architecture

```text
React client
    │  validated API requests and safe public responses
    ▼
Node.js + Express API
    │  authentication · validation · bounded service orchestration
    ├──────────────────────────────► MongoDB (owned application data)
    └──────────────────────────────► Gemini adapter (structured AI requests)
```

The project is intentionally a modular monolith: simple to run and deploy, while keeping UI, route, controller, service, data-access, validation, and external-provider responsibilities separate.

## Technology

| Layer          | Technology                                                             |
| -------------- | ---------------------------------------------------------------------- |
| Client         | React, React Router, Vite                                              |
| API            | Node.js, Express                                                       |
| Data           | MongoDB, Mongoose                                                      |
| AI integration | Backend-only Gemini Developer API through a provider-neutral interface |
| Quality        | Vitest, Testing Library, Supertest, Oxc tooling, Prettier              |
| Deployment     | Render static web service and Node web service                         |

## Run locally

### Prerequisites

- Node.js `22.16.x` and npm
- A reachable MongoDB database
- A Gemini API key for live AI-backed practice

### Setup

```bash
git clone https://github.com/Rudranil-Datta/MockMateAI.git
cd MockMateAI
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Configure the required server-side values in `server/.env`:

| Variable         | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `MONGODB_URI`    | Connection string for your MongoDB database       |
| `GEMINI_API_KEY` | Server-only credential for Gemini requests        |
| `AUTH_SECRET`    | Private secret used to sign authentication tokens |

Keep these values private. Do not place database credentials, API keys, or authentication secrets in `client/.env`, because `VITE_` values are available to the browser.

Start the API and client in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Then open <http://localhost:5173>. The API health endpoint is available at <http://localhost:4444/health>.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

The project uses focused deterministic tests for application behaviour and provider adapters. Live AI availability, quota, browser/device support, and network conditions remain external dependencies, so they are handled with bounded requests and clear recovery states rather than invented results.

## Live demo

Try the deployed application at [mockmateai-web-rudranil-datta.onrender.com](https://mockmateai-web-rudranil-datta.onrender.com).

The demo is hosted on Render's free tier, so the first request after inactivity may take a moment while the service wakes up.

## Project status

MockMateAI has an implemented interview-practice baseline and an active context-aware preparation extension. The product continues to prioritise verified behaviour, privacy, accessible UI, and a dependable text-first practice path over unbounded feature expansion.

## Contributing

Issues and improvements are welcome. Please keep changes focused, preserve the ownership and validation boundaries, avoid committing secrets, and include relevant tests for changed behaviour.

## License

This repository is provided for academic and demonstration purposes. Contact the repository owner before reusing it outside that context.

# MockMateAI — Team Development Guide

## Repository Workflow

We use two branches:

- `main` → Stable and approved code
- `dev` → Active development

### Rules

- Everyone works on `dev`.
- Team members have **Write** access.
- Do not push directly to `main`.
- `main` is protected.
- The repository owner reviews and merges changes into `main`.
- No feature branches are required.

---

## 1. First-Time Setup

Clone the repository:

```bash
git clone https://github.com/Rudranil-Datta/MockMateAI.git
cd MockMateAI
```

Switch to `dev`:

```bash
git checkout dev
git pull origin dev
```

Install workspace dependencies:

```bash
npm install
```

Create local configuration files from the templates. Do not commit these files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Run the application in two terminals:

```bash
npm run dev:server
npm run dev:client
```

The client runs at `http://localhost:5173`; the API health endpoint is
`http://localhost:4444/health`.

The browser uses only `VITE_API_BASE_URL=http://localhost:4444/api`. Server
credentials, MongoDB URIs, and AI-provider keys belong only in `server/.env`.
The shared client request wrapper lives at `client/src/api/httpClient.js`; it
uses the documented API error envelope and returns safe network/response errors.

The API accepts credentialed browser requests only from `CLIENT_ORIGIN`. Keep
it as `http://localhost:5173` locally; set it to the exact HTTPS frontend origin
when deployed. JSON request bodies are limited to `100kb`, and API responses use
baseline security headers.

Before submitting work, run:

```bash
npm run lint
npm test
npm run build
npm run format
```

While making a focused change, run the smallest relevant suite first. For
example, backend work uses:

```bash
npm test --workspace=server
```

Run the full checks above once after the final change. For API smoke checks,
start one temporary server, verify the relevant endpoint, then stop it and
confirm its port is free. Integration tests use the cached
`mongodb-memory-server` binary and never use the configured Atlas database.

---

## 2. Using Codex and Caveman

Open Codex from the repository root. Codex automatically reads `AGENTS.md`,
which contains the project's architecture, security, scope, and daily-work
rules.

Caveman makes the agent's chat replies shorter while code is being written or
refactored. It does not change code quality requirements, skip tests, approve
work, or reduce the need to review changes.

Use these commands in Codex chat:

```text
/caveman       # Concise full mode
/caveman lite  # Professional, lightly compressed mode
/caveman ultra # Most compressed mode
/caveman off   # Return to normal mode
```

For this repository, Codex also applies Caveman automatically while writing or
refactoring code. It must use normal, clear prose when presenting task lists,
plans, risks, mitigations, reasons, approval requests, security warnings, or
manual instructions. Project documentation, code comments, commit messages,
and user-facing application text must remain normal professional English.

### Agent-assisted daily workflow

1. Start in the repository root and pull the latest `dev` branch.
2. Ask Codex to read `project_memory/IMPLEMENTATION_STATUS.md` and the direct
   documentation/code relevant to the assigned task.
3. For implementation work, review the proposed bounded tasks, risks,
   mitigations, and possible deviations before approving edits.
4. Use Caveman during coding or refactoring if concise responses help.
5. Run the required validation commands, review `git diff`, and confirm no
   `.env` file or secret is staged.
6. Ask Codex to update `IMPLEMENTATION_STATUS.md` after the day or task is
   complete. Update another project document only if the implementation changed
   its documented contract, design, security rule, or scope.

`IMPLEMENTATION_STATUS.md` is the sole live work tracker. Use
`IMPLEMENTATION_TIMELINE.md` for the approved plan; do not create a separate
task board.

## 3. Start Working

Always get the latest changes before starting:

```bash
git checkout dev
git pull origin dev
```

Work on your assigned part of the project.

---

## 4. Push Your Changes

After completing your work:

```bash
git add .
git commit -m "Describe your changes"
git pull origin dev
git push origin dev
```

Your changes will be pushed to the shared `dev` branch.

---

## 5. Before Pushing

Since everyone works on the same `dev` branch, always pull the latest changes before pushing:

```bash
git pull origin dev
```

If there are conflicts, resolve them, then:

```bash
git add .
git commit -m "Resolve merge conflicts"
git push origin dev
```

---

## 6. Merging into `main`

Do **not** merge or push directly to `main`.

When the `dev` branch is ready:

1. The repository owner creates a Pull Request from `dev` → `main`.
2. The owner reviews the changes.
3. The owner merges the Pull Request.

```text
Team → dev → Pull Request → main
                    ↓
               Owner Review
                    ↓
                  Merge
```

---

## 7. Important

### Do

```bash
git checkout dev
git pull origin dev
git add .
git commit -m "Your message"
git pull origin dev
git push origin dev
```

### Don't

```bash
git push origin main
```

Always work on `dev`.

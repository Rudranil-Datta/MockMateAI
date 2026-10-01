# MockMateAI Development Guide

This guide covers the complete local-development workflow. Choose **one** Git
workflow and use it consistently:

- **Fork workflow:** for contributors without direct repository write access or
  when changes must come through a personal fork.
- **Direct collaboration workflow:** for approved team members with write
  access to the original repository.

In both workflows, active development targets `dev`. Never commit or push
directly to `main`. The repository owner promotes approved work through a pull
request from `dev` to `main`.

## 1. Prerequisites

Install:

- Git
- Node.js 22 or newer
- npm
- Codex, if using AI-assisted development

You also need the two private environment files supplied by the repository
owner. Do not request or share their contents in GitHub issues, pull requests,
commits, or Codex chat.

## 2. Choose a Git Workflow

### Flow 1: Fork workflow

Use this flow when working through your own GitHub fork.

#### First-time setup

1. On GitHub, fork
   `https://github.com/Rudranil-Datta/MockMateAI` into your account.
2. Clone your fork, replacing `<your-github-username>`:

   ```bash
   git clone https://github.com/<your-github-username>/MockMateAI.git
   cd MockMateAI
   ```

3. Add the original repository as `upstream`:

   ```bash
   git remote add upstream https://github.com/Rudranil-Datta/MockMateAI.git
   git fetch upstream
   git remote -v
   ```

   `origin` must point to your fork. `upstream` must point to the original
   repository. Add `upstream` only once.

4. Check whether your fork already has a remote `dev` branch:

   ```bash
   git branch -r --list origin/dev
   ```

   If `origin/dev` is listed:

   ```bash
   git switch --track origin/dev
   ```

   If it is not listed, create your fork's `dev` from the original `dev`:

   ```bash
   git switch -c dev --track upstream/dev
   git push -u origin dev
   ```

#### Start each work session

Sync your fork with the original repository before changing files:

```bash
git fetch upstream
git switch dev
git merge upstream/dev
git push origin dev
```

GitHub's **Sync fork** button is optional. The commands above perform the same
job locally and update your fork on GitHub.

#### Submit work

```bash
git status
git add <changed-file-or-directory>
git commit -m "Describe the change"
git fetch upstream
git merge upstream/dev
git push origin dev
```

If Git reports conflicts, resolve them carefully, run the relevant checks, then
finish the merge and push. Open a pull request with:

- **Source:** `<your-github-username>/MockMateAI`, branch `dev`
- **Target:** `Rudranil-Datta/MockMateAI`, branch `dev`

Do not target `main`. After the contribution is merged, sync your fork again
before starting new work.

### Flow 2: Direct collaboration workflow

Use this flow only when the repository owner has granted you write access.

#### First-time setup

```bash
git clone https://github.com/Rudranil-Datta/MockMateAI.git
cd MockMateAI
git switch --track origin/dev
git pull --ff-only origin dev
```

If `dev` already exists locally, use `git switch dev` instead of the tracking
command.

#### Start each work session

```bash
git switch dev
git pull --ff-only origin dev
```

Coordinate assignments before editing shared files because all direct
collaborators use the same remote `dev` branch.

#### Submit work

```bash
git status
git add <changed-file-or-directory>
git commit -m "Describe the change"
git pull --rebase origin dev
git push origin dev
```

If the rebase reports conflicts, resolve them, stage the resolved files, and run
`git rebase --continue`. Then rerun affected checks and push. Never push directly
to `main`. The repository owner creates and reviews the final pull request from
the original repository's `dev` branch to `main`.

### Repository owner: keep `dev` current

In the normal workflow, changes begin on `dev` and reach `main` through a pull
request, so contributors already have the approved content. If an exceptional
hotfix, documentation update, or administrator bypass lands only on `main`, the
owner must bring that change back into `dev` before contributors continue.

With a clean working tree:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge origin/main
git push origin dev
git switch main
```

When `dev` has no unique commits, the merge is a fast-forward and creates no
merge commit. If `dev` has separate work, review and resolve the merge normally,
run affected checks, and then push. Never reset or force-push shared `dev` to
make it match `main`.

## 3. Environment Files

The repository owner supplies both private files. After cloning, place them at
these exact paths:

```text
MockMateAI/
├── server/
│   └── .env
└── client/
    └── .env
```

- `server/.env` contains backend configuration, the database connection,
  authentication secret, AI-provider keys, quotas, timeouts, and upload limits.
- `client/.env` contains public browser configuration, currently
  `VITE_API_BASE_URL`.

Do not rename either file or add a `.txt` extension. When the owner supplies
both files, you do not need to copy `.env.example`. The example files remain
committed documentation and are not loaded at runtime.

Every client variable prefixed with `VITE_` is exposed to the browser. Never put
database credentials, authentication secrets, or provider API keys in
`client/.env`.

Confirm both private files are ignored by Git:

```bash
git check-ignore server/.env client/.env
```

The command must print both paths. If either path is missing from the output,
stop and contact the repository owner before committing anything.

Do not commit, stage, paste, screenshot, or publicly transmit either `.env`
file. Restart the affected development server after changing an environment
file.

## 4. Install and Start the Project

Run commands from the repository root unless stated otherwise.

### Easy start with Codex

After cloning the repository and placing both supplied `.env` files in their
documented locations, open the repository root in Codex and send:

```text
Read AGENTS.md and DEVELOPMENT_GUIDE.md. Verify that server/.env and client/.env
exist and are ignored by Git without displaying their values. Install the
project dependencies if needed, then launch the API and client for this local
development session. Report the local URLs and any startup errors. Do not modify,
display, stage, or commit either .env file. Keep only the required processes
running, and stop them when I ask or when the development session ends.
```

Approve any required local dependency-installation or process-start permission
prompt. Codex should report failures truthfully rather than replacing missing
credentials or changing configuration without approval.

### Manual start

Install all client and server dependencies:

```bash
npm install
```

Start the API in the first terminal:

```bash
npm run dev:server
```

Start the client in a second terminal:

```bash
npm run dev:client
```

Local addresses:

- Application: `http://localhost:5173`
- API health check: `http://localhost:4444/health`

Stop each process with `Ctrl+C`. Do not leave development or test servers
running after the work session.

## 5. Using Codex and Caveman

Open the project in Codex from the repository root. Codex automatically reads
`AGENTS.md`, which defines architecture, security, approval, testing, and
delivery rules.

Before an implementation or remediation task, tell Codex to:

1. Read `project_memory/IMPLEMENTATION_STATUS.md` and
   `project_memory/DELIVERY_ASSURANCE.md`.
2. Read only documentation and code directly relevant to the assigned scope.
3. Produce or follow the approved requirement traceability and verification
   plan.
4. Wait for explicit approval before making unapproved changes or expanding
   scope.
5. Use focused, risk-based tests and report limitations truthfully.

Do not paste secrets into Codex chat or ask Codex to display `.env` values. When
environment inspection is necessary, ask it to inspect variable names with
values masked.

### Caveman commands

Caveman shortens chat responses without weakening implementation, security,
approval, documentation, or testing requirements:

```text
/caveman       Concise full mode
/caveman lite  Lightly compressed professional mode
/caveman ultra Maximum compression
/caveman off   Normal response style
```

This repository applies Caveman automatically while Codex writes or refactors
code. Plans, risks, approval requests, security warnings, manual instructions,
documentation, code comments, commit messages, and user-facing text must remain
clear professional English.

## 6. Validate and Commit Safely

Run the smallest checks required by the approved task. Common commands are:

```bash
npm test --workspace=server
npm test --workspace=client
npm run lint
npm run build
npm run format
npm run validate:delivery
```

Do not run every command automatically. Use focused affected tests first; run
full workspace checks only for milestones, release gates, cross-cutting changes,
or explicit requests, as required by `AGENTS.md`.

Before every commit:

```bash
git status
git diff
git diff --cached
```

Stage only intended paths rather than using `git add .`. Confirm neither `.env`
file appears in staged changes:

```bash
git diff --cached --name-only
```

If a secret was committed or pushed, deleting the line is not enough. Stop,
notify the repository owner privately, and rotate the exposed credential.

## 7. Daily Checklist

1. Choose the correct Git workflow; do not mix `origin` and `upstream` roles.
2. Sync `dev` before editing.
3. Confirm both `.env` files are in the correct locations and ignored.
4. Install dependencies when first setting up or when the lockfile changes.
5. Start API and client in separate terminals.
6. Work only on the assigned, approved scope.
7. Run focused affected checks.
8. Review the diff and staged files; exclude secrets and unrelated changes.
9. Commit, sync again, and push using the selected workflow.
10. Stop local processes when finished.

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

---

## 2. Start Working

Always get the latest changes before starting:

```bash
git checkout dev
git pull origin dev
```

Work on your assigned part of the project.

---

## 3. Push Your Changes

After completing your work:

```bash
git add .
git commit -m "Describe your changes"
git pull origin dev
git push origin dev
```

Your changes will be pushed to the shared `dev` branch.

---

## 4. Before Pushing

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

## 5. Merging into `main`

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

## 6. Important

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

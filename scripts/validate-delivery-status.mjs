import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function readRequired(relativePath) {
  const absolutePath = resolve(root, relativePath);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireText(content, expected, source) {
  if (!content.includes(expected)) {
    failures.push(`${source} is missing: ${expected}`);
  }
}

function requireTableEntry(content, entry, source) {
  const escapedEntry = entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (!new RegExp(`^\\|\\s*${escapedEntry}\\s*\\|`, "m").test(content)) {
    failures.push(`${source} is missing: ${entry}`);
  }
}

const agents = readRequired("AGENTS.md");
const assurance = readRequired("project_memory/DELIVERY_ASSURANCE.md");
const status = readRequired("project_memory/IMPLEMENTATION_STATUS.md");

requireText(agents, "project_memory/DELIVERY_ASSURANCE.md", "AGENTS.md");

for (const heading of [
  "## Required Delivery Lifecycle",
  "## Finding Severity and Disposition",
  "## Status Definitions",
  "## Audit and Remediation Protocol",
  "## Required Status Structure",
]) {
  requireText(assurance, heading, "DELIVERY_ASSURANCE.md");
}

const currentPlanStart = status.indexOf("## Current Day Execution Plan");
const completedLogStart = status.indexOf("## Completed Work Log");

if (
  currentPlanStart === -1 ||
  completedLogStart === -1 ||
  completedLogStart <= currentPlanStart
) {
  failures.push(
    "IMPLEMENTATION_STATUS.md must contain the current plan before the completed log.",
  );
} else {
  const currentPlan = status.slice(currentPlanStart, completedLogStart);

  for (const requiredText of [
    "**Current status:**",
    "**Approval scope:**",
    "### Objective",
    "### Requirement traceability matrix",
    "Implementation evidence",
    "Verification evidence",
    "### Verification matrix",
    "### Current blockers / decisions needed",
    "### Deviation and finding register",
    "### Completion review",
  ]) {
    requireText(currentPlan, requiredText, "current execution plan");
  }

  for (const category of [
    "Success",
    "Validation",
    "Authentication/ownership",
    "State and concurrency",
    "Dependency/provider failure",
    "Persistence failure",
    "Recovery/retry",
    "Privacy/security",
    "Regression",
    "Documentation",
  ]) {
    requireTableEntry(currentPlan, category, "verification matrix");
  }

  const isComplete = /\*\*Current status:\*\*[^\n]*\bComplete\b/.test(
    currentPlan,
  );

  if (isComplete && /\bPending\b/.test(currentPlan)) {
    failures.push(
      "The current plan is Complete but still contains Pending evidence or status.",
    );
  }

  if (
    isComplete &&
    /Unresolved P0\/P1 findings:\s*(?:\*\*)?Yes\b/i.test(currentPlan)
  ) {
    failures.push(
      "The current plan is Complete with unresolved P0/P1 findings.",
    );
  }
}

const duplicateRulesDirectory = resolve(root, ".codex/rules");

if (existsSync(duplicateRulesDirectory)) {
  const duplicateMarkdownFiles = readdirSync(duplicateRulesDirectory).filter(
    (file) => file.endsWith(".md"),
  );

  if (duplicateMarkdownFiles.length > 0) {
    failures.push(
      `Redundant .codex/rules Markdown copies found: ${duplicateMarkdownFiles.join(", ")}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Delivery status validation failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log("Delivery status structure is valid.");
}

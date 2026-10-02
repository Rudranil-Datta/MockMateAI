import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const fixtureRoot = mkdtempSync(join(tmpdir(), "mockmateai-delivery-status-"));
const validatorPath = fileURLToPath(
  new URL("./validate-delivery-status.mjs", import.meta.url),
);

mkdirSync(join(fixtureRoot, "project_memory"));
writeFileSync(
  join(fixtureRoot, "AGENTS.md"),
  "Use project_memory/DELIVERY_ASSURANCE.md.\n",
);
writeFileSync(
  join(fixtureRoot, "project_memory/DELIVERY_ASSURANCE.md"),
  [
    "## Required Delivery Lifecycle",
    "## Finding Severity and Disposition",
    "## Status Definitions",
    "## Audit and Remediation Protocol",
    "## Required Status Structure",
  ].join("\n"),
);

after(() => rmSync(fixtureRoot, { force: true, recursive: true }));

function statusDocument(currentStatus) {
  const categories = [
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
  ];

  return [
    "## Current Day Execution Plan",
    `**Current status:** ${currentStatus}`,
    "**Approval scope:** Approved.",
    "### Objective",
    "Complete the approved task.",
    "### Requirement traceability matrix",
    "Implementation evidence",
    "Verification evidence",
    "### Verification matrix",
    ...categories.map((category) => `| ${category} | Passed |`),
    "### Current blockers / decisions needed",
    "None.",
    "### Deviation and finding register",
    "None.",
    "### Completion review",
    "Complete.",
    "## Superseded plan",
    "Pending historical evidence.",
    "## Completed Work Log",
    "| Day | Status |",
  ].join("\n");
}

function runValidator(currentStatus) {
  writeFileSync(
    join(fixtureRoot, "project_memory/IMPLEMENTATION_STATUS.md"),
    statusDocument(currentStatus),
  );

  return spawnSync(process.execPath, [validatorPath], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
}

test("ignores Pending text outside the current execution plan", () => {
  const result = runValidator("Complete");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Delivery status structure is valid/);
});

test("rejects Pending text inside a Complete current execution plan", () => {
  const result = runValidator("Complete — Pending evidence");

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /current plan is Complete but still contains Pending/,
  );
});

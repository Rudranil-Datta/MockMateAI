import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { createReadmeImportService } from "../../src/services/readmeImportService.js";

async function file(text) {
  const directory = await mkdtemp(join(tmpdir(), "mockmateai-readme-"));
  const path = join(directory, "input.md");
  await writeFile(path, text);
  return { directory, path };
}

describe("README import parser", () => {
  it("maps recognized content, bounds unmatched review, and removes temporary input", async () => {
    const input = await file(
      `# MockMateAI\n\n## Summary\nPractice platform for structured interview preparation.\n\n## Role\nDeveloper\n\n## Technologies\n- React\n- Node.js\n\n## Architecture\n- Client and API layers\n\n## Responsibilities\n- Built project workflows\n\n## Results\n- Improved completion clarity\n\n## Notes\nPrivate unmatched note`,
    );
    const result = await createReadmeImportService().importDraft({
      file: { path: input.path },
    });
    expect(result.draft).toMatchObject({
      name: "MockMateAI",
      role: "Developer",
      source: "readme_import",
      technologies: ["React", "Node.js"],
    });
    expect(result.review.missingFields).toEqual([]);
    expect(result.review.unmatchedText).toContain("Notes");
    await expect(readdir(input.directory)).resolves.toEqual([]);
  });

  it("rejects binary input and removes it", async () => {
    const input = await file("text\0binary");
    await expect(
      createReadmeImportService().importDraft({ file: { path: input.path } }),
    ).rejects.toMatchObject({ code: "INVALID_README_IMPORT" });
    await expect(readdir(input.directory)).resolves.toEqual([]);
  });

  it("omits short extracted values and marks required fields missing", async () => {
    const input = await file(`# X

## Summary
Too short

## Role
X

## Technologies
- R

## Architecture
- Tiny

## Responsibilities
- Tiny`);
    const result = await createReadmeImportService().importDraft({
      file: { path: input.path },
    });
    expect(result.draft).toMatchObject({
      architecture: [],
      name: "",
      responsibilities: [],
      role: "",
      summary: "",
      technologies: ["R"],
    });
    expect(result.review.missingFields).toEqual(
      expect.arrayContaining([
        "name",
        "summary",
        "role",
        "architecture",
        "responsibilities",
      ]),
    );
    await expect(readdir(input.directory)).resolves.toEqual([]);
  });
});

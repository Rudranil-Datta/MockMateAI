import { readFile, rm } from "node:fs/promises";

import { AppError } from "../utils/AppError.js";

const required = [
  "name",
  "summary",
  "role",
  "technologies",
  "responsibilities",
  "architecture",
];
const headings = new Map([
  ["project", "name"],
  ["name", "name"],
  ["summary", "summary"],
  ["overview", "summary"],
  ["description", "summary"],
  ["role", "role"],
  ["my role", "role"],
  ["technologies", "technologies"],
  ["tech stack", "technologies"],
  ["tools", "technologies"],
  ["architecture", "architecture"],
  ["system design", "architecture"],
  ["responsibilities", "responsibilities"],
  ["contributions", "responsibilities"],
  ["decisions", "decisions"],
  ["trade-offs", "tradeoffs"],
  ["tradeoffs", "tradeoffs"],
  ["claims", "claims"],
  ["results", "claims"],
]);
const listFields = new Set([
  "technologies",
  "architecture",
  "responsibilities",
  "decisions",
  "tradeoffs",
  "claims",
]);
const limits = {
  technologies: [15, 50],
  architecture: [10, 300],
  responsibilities: [10, 300],
  decisions: [8, 300],
  tradeoffs: [8, 300],
  claims: [8, 300],
};
const minimumLengths = {
  technologies: 1,
  architecture: 5,
  responsibilities: 5,
  decisions: 5,
  tradeoffs: 5,
  claims: 5,
};
const scalarMinimumLengths = { name: 2, role: 2, summary: 20 };

function clean(value) {
  return value
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+|#+\s*)/, "")
    .replaceAll(/[`*_]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}
function unique(items) {
  return [...new Map(items.map((item) => [item.toLowerCase(), item])).values()];
}
function invalidFile() {
  return new AppError(
    "INVALID_README_IMPORT",
    "README must be valid UTF-8 text.",
    { status: 415 },
  );
}

export function createReadmeImportService({ maxCharacters = 100000 } = {}) {
  return {
    async importDraft({ file }) {
      if (!file)
        throw new AppError(
          "README_IMPORT_REQUIRED",
          "Choose a README text file to import.",
          { status: 400 },
        );
      try {
        let text;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(
            await readFile(file.path),
          );
        } catch {
          throw invalidFile();
        }
        text = text.replace(/^\uFEFF/, "");
        if (
          text.length > maxCharacters ||
          /\0|[\x01-\x08\x0B\x0C\x0E-\x1F]/.test(text)
        )
          throw invalidFile();
        if (!text.trim())
          throw new AppError(
            "README_IMPORT_EMPTY",
            "README must contain text.",
            { status: 400 },
          );
        const values = {
          name: "",
          summary: "",
          role: "",
          technologies: [],
          architecture: [],
          responsibilities: [],
          decisions: [],
          tradeoffs: [],
          claims: [],
        };
        const unmatched = [];
        let field = null;
        const recognized = new Set();
        for (const raw of text.split(/\r?\n/)) {
          const heading = raw.match(/^#{1,6}\s+(.+)$/)?.[1];
          if (heading) {
            const headingText = clean(heading);
            field = headings.get(headingText.toLowerCase()) || null;
            if (!field && raw.startsWith("# ") && !values.name) field = "name";
            if (field) {
              recognized.add(field);
              if (field === "name" && !values.name)
                values.name = headingText.slice(0, 120);
            } else unmatched.push(headingText);
            continue;
          }
          const line = clean(raw);
          if (!line) continue;
          if (!field && !values.name && raw.startsWith("# ")) {
            values.name = line;
            recognized.add("name");
            continue;
          }
          if (!field) {
            unmatched.push(line);
            continue;
          }
          if (listFields.has(field)) values[field].push(line);
          else if (!values[field]) values[field] = line;
          else values[field] = `${values[field]} ${line}`;
        }
        for (const [key, value] of Object.entries(values)) {
          if (Array.isArray(value)) {
            const [count, max] = limits[key];
            values[key] = unique(
              value.filter(
                (item) =>
                  item.length >= minimumLengths[key] && item.length <= max,
              ),
            ).slice(0, count);
          } else {
            const bounded = value.slice(0, key === "summary" ? 1000 : 120);
            values[key] =
              bounded.length >= scalarMinimumLengths[key] ? bounded : "";
          }
        }
        values.claims = values.claims.map((text) => ({ evidence: null, text }));
        const reviewLines = unmatched.filter(Boolean).slice(0, 20);
        const reviewText = reviewLines.join("\n").slice(0, 2000);
        return {
          draft: { ...values, source: "readme_import" },
          review: {
            missingFields: required.filter(
              (key) => !values[key] || values[key].length === 0,
            ),
            omittedLineCount: Math.max(
              0,
              unmatched.length - reviewLines.length,
            ),
            recognizedSections: [...recognized],
            unmatchedText: reviewText,
          },
        };
      } finally {
        await rm(file.path, { force: true });
      }
    },
  };
}

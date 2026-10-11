import { open, rm } from "node:fs/promises";
import { basename } from "node:path";

import Resume from "../models/Resume.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";
import { extractPdfText as defaultExtractPdfText } from "./pdfTextExtractor.js";

const maxResumeContextLength = 2_000;
const maxProjectResumeContextLength = 8_000;
const projectSelectionBudget = 6_000;
const maxProjectExcerptLength = 1_000;
const safeExtractionError = "Resume text could not be extracted.";
const projectSectionScores = new Map([
  ["projects", 4],
  ["project", 4],
  ["experience", 3],
  ["work experience", 3],
  ["professional experience", 3],
  ["academic", 2],
  ["academic projects", 2],
  ["github", 1],
]);
const projectCuePattern =
  /\b(api|application|architecture|built|created|deployed|designed|developed|engineered|github|implemented|integrated|javascript|node(?:\.js)?|platform|react|repository|service|shipped|technology|typescript)\b/gi;

async function removeStoredFile(path) {
  if (path) {
    await rm(path, { force: true });
  }
}

function safeOriginalName(originalName) {
  const normalizedName = basename(originalName || "resume.pdf")
    .replaceAll(/[\\/]/g, "_")
    .replaceAll(/\p{Cc}/gu, "_")
    .slice(0, 255);

  return normalizedName || "resume.pdf";
}

function toSafeResume(resume) {
  return {
    createdAt:
      resume.createdAt instanceof Date
        ? resume.createdAt.toISOString()
        : resume.createdAt,
    extractionStatus: resume.extractionStatus,
    id: resume.id || resume._id?.toString(),
    mimeType: resume.mimeType,
    originalName: resume.originalName,
    sizeBytes: resume.sizeBytes,
  };
}

function toResumeContext(text) {
  return text.replaceAll(/\s+/g, " ").trim().slice(0, maxResumeContextLength);
}

function normalizeResumeLine(line) {
  return line.replaceAll(/\s+/g, " ").trim();
}

function normalizedHeading(line) {
  return line
    .replace(/^[-*#\d.)\s]+/, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

function isSectionHeading(line) {
  const value = line.trim();
  const heading = normalizedHeading(value);
  return (
    projectSectionScores.has(heading) ||
    /^#{1,6}\s+/.test(value) ||
    (value.length <= 80 && value.endsWith(":")) ||
    (value.length <= 80 && /[A-Z]/.test(value) && value === value.toUpperCase())
  );
}

function hasProjectCue(line) {
  return (line.match(projectCuePattern) || []).length;
}

function isLikelyPersonalLine(line) {
  return /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\+?\d[\d\s().-]{7,}\d/.test(line);
}

function appendBoundedExcerpt(context, excerpt, limit) {
  const separator = context ? "\n\n" : "";
  const remaining = limit - context.length - separator.length;
  if (remaining <= 0) return context;
  return `${context}${separator}${excerpt.slice(0, remaining)}`;
}

function isProjectEntryTitle(line) {
  return (
    line.length <= 120 &&
    !/[.!?;,:]$/.test(line) &&
    line.split(/\s+/).length <= 10 &&
    /[A-Z]/.test(line)
  );
}

function toProjectResumeContext(text) {
  const lines = text.split(/\r?\n/).map(normalizeResumeLine).filter(Boolean);
  const blocks = [];
  let section = "";
  let block;

  function finishBlock() {
    if (!block?.lines.length) return;
    const sectionScore =
      projectSectionScores.get(normalizedHeading(section)) || 0;
    const text = [section, ...block.lines].filter(Boolean).join("\n");
    const cueScore = hasProjectCue(text);
    if (sectionScore || cueScore) {
      blocks.push({
        index: block.index,
        score: sectionScore * 10 + cueScore,
        text,
      });
    }
    block = undefined;
  }

  lines.forEach((line, index) => {
    const heading = normalizedHeading(line);
    if (isSectionHeading(line)) {
      finishBlock();
      if (projectSectionScores.has(heading)) {
        section = line;
        block = { index, lines: [] };
      } else {
        block = { index, lines: [line] };
      }
      return;
    }
    if (isLikelyPersonalLine(line)) return;
    const sectionScore =
      projectSectionScores.get(normalizedHeading(section)) || 0;
    const blockLength = block?.lines.join("\n").length || 0;
    if (
      block?.lines.length &&
      ((sectionScore && isProjectEntryTitle(line)) ||
        blockLength + line.length + 1 > maxProjectExcerptLength)
    ) {
      finishBlock();
    }
    if (!block) block = { index, lines: [] };
    block.lines.push(line);
  });
  finishBlock();

  const selected = blocks
    .toSorted(
      (left, right) => right.score - left.score || left.index - right.index,
    )
    .slice(0, 5)
    .map(({ index }) => index);
  const selectedIndexes = new Set();
  let context = "";

  for (const index of selected) {
    const candidate = blocks.find((value) => value.index === index);
    if (!candidate) continue;
    const next = appendBoundedExcerpt(
      context,
      `[Project excerpt]\n${candidate.text.slice(0, maxProjectExcerptLength)}`,
      projectSelectionBudget,
    );
    if (next === context) break;
    context = next;
    selectedIndexes.add(index);
  }

  const fallback =
    lines.find(
      (line, index) =>
        !selectedIndexes.has(index) &&
        !isSectionHeading(line) &&
        !isLikelyPersonalLine(line),
    ) || blocks[0]?.text;
  if (fallback) {
    context = appendBoundedExcerpt(
      context,
      `[Fallback excerpt]\n${fallback}`,
      maxProjectResumeContextLength,
    );
  }

  return context.slice(0, maxProjectResumeContextLength);
}

function unavailableContext() {
  return new AppError(
    "RESUME_CONTEXT_UNAVAILABLE",
    "Resume context is unavailable. Choose another resume or continue without one.",
    { status: 422 },
  );
}

async function hasPdfSignature(path) {
  const fileHandle = await open(path, "r");

  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await fileHandle.read(signature, 0, 5, 0);

    return bytesRead === 5 && signature.toString("utf8") === "%PDF-";
  } finally {
    await fileHandle.close();
  }
}

export function createResumeService({
  extractPdfText = defaultExtractPdfText,
  resumeModel = Resume,
} = {}) {
  const service = {
    async listOwnedResumes({ userId }) {
      const resumes = await resumeModel
        .find({ userId })
        .select(
          "_id createdAt extractionStatus mimeType originalName sizeBytes",
        )
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return resumes.map(toSafeResume);
    },

    async createResume({ file, userId }) {
      if (!file) {
        throw new AppError(
          "RESUME_REQUIRED",
          "Choose a PDF resume to upload.",
          {
            status: 400,
          },
        );
      }

      try {
        if (!(await hasPdfSignature(file.path))) {
          throw new AppError(
            "INVALID_RESUME_FILE",
            "Resume must be a valid PDF file.",
            { status: 415 },
          );
        }

        let extraction;
        try {
          extraction = {
            extractedText: await extractPdfText(file.path),
            extractionStatus: "completed",
          };
        } catch {
          extraction = {
            extractionError: safeExtractionError,
            extractionStatus: "failed",
          };
        }

        const resume = await resumeModel.create({
          ...extraction,
          mimeType: file.mimetype,
          originalName: safeOriginalName(file.originalname),
          sizeBytes: file.size,
          userId,
        });

        return toSafeResume(resume);
      } finally {
        await removeStoredFile(file.path);
      }
    },

    async getOwnedResumeContext({ resumeId, userId }) {
      const resume = await resumeModel
        .findOne({
          ...getOwnedResourceFilter(resumeId, userId),
          extractionStatus: "completed",
        })
        .select("extractedText")
        .lean();

      const context = toResumeContext(resume?.extractedText || "");

      if (!context) {
        throw unavailableContext();
      }

      return context;
    },

    async getOwnedResumeProjectContext({ resumeId, userId }) {
      const resume = await resumeModel
        .findOne({
          ...getOwnedResourceFilter(resumeId, userId),
          extractionStatus: "completed",
        })
        .select("extractedText")
        .lean();
      const context = toProjectResumeContext(resume?.extractedText || "");
      if (!context) throw unavailableContext();
      return context;
    },

    async assertOwnedCompletedResume({ resumeId, userId }) {
      const resume = await resumeModel
        .findOne({
          ...getOwnedResourceFilter(resumeId, userId),
          extractionStatus: "completed",
        })
        .select("_id")
        .lean();
      if (!resume) throw unavailableContext();
    },
  };

  return service;
}

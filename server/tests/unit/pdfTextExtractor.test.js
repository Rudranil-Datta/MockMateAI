import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createPdfTextExtractor } from "../../src/services/pdfTextExtractor.js";
import { createTestPdf } from "../helpers/createTestPdf.js";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryPdf(contents = createTestPdf()) {
  const directory = await mkdtemp(join(tmpdir(), "mockmateai-pdf-text-"));
  const path = join(directory, "resume.pdf");
  temporaryDirectories.push(directory);
  await writeFile(path, contents);
  return path;
}

function createFakeWorker(run) {
  const worker = new EventEmitter();
  worker.terminate = vi.fn().mockResolvedValue(1);
  queueMicrotask(() => run(worker));
  return worker;
}

describe("pdfTextExtractor", () => {
  it("passes hard resource and extraction limits to its worker", async () => {
    const workerFactory = vi.fn(() =>
      createFakeWorker((worker) => {
        worker.emit("message", { ok: true, text: "Backend Engineer" });
      }),
    );
    const extractPdfText = createPdfTextExtractor({
      maxFileSizeBytes: 1024,
      maxPages: 3,
      maxTextLength: 16,
      workerFactory,
    });

    await expect(extractPdfText("/private/resume.pdf")).resolves.toBe(
      "Backend Engineer",
    );
    expect(workerFactory).toHaveBeenCalledWith({
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
      workerData: {
        maxFileSizeBytes: 1024,
        maxPages: 3,
        maxTextLength: 16,
        path: "/private/resume.pdf",
      },
    });
  });

  it("extracts normalized bounded text in the real worker", async () => {
    const path = await createTemporaryPdf(
      createTestPdf("Backend Engineer Node MongoDB"),
    );
    const extractPdfText = createPdfTextExtractor({
      maxPages: 3,
      maxTextLength: 16,
    });

    await expect(extractPdfText(path)).resolves.toBe("Backend Engineer");
  });

  it("rejects files above the extraction limit before parsing", async () => {
    const path = await createTemporaryPdf();
    const extractPdfText = createPdfTextExtractor({
      maxFileSizeBytes: 4,
    });

    await expect(extractPdfText(path)).rejects.toThrow(
      "PDF text could not be extracted.",
    );
  });

  it("rejects malformed or oversized worker output", async () => {
    const malformedExtractor = createPdfTextExtractor({
      workerFactory: () =>
        createFakeWorker((worker) => {
          worker.emit("message", { ok: true, text: "" });
        }),
    });
    const oversizedExtractor = createPdfTextExtractor({
      maxTextLength: 3,
      workerFactory: () =>
        createFakeWorker((worker) => {
          worker.emit("message", { ok: true, text: "four" });
        }),
    });

    await expect(malformedExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(oversizedExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
  });

  it("maps worker errors and early exits to safe extraction failures", async () => {
    const errorExtractor = createPdfTextExtractor({
      workerFactory: () =>
        createFakeWorker((worker) => worker.emit("error", new Error("secret"))),
    });
    const exitExtractor = createPdfTextExtractor({
      workerFactory: () => createFakeWorker((worker) => worker.emit("exit", 0)),
    });

    await expect(errorExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(exitExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
  });

  it("terminates the worker at the configured extraction timeout", async () => {
    let worker;
    const extractPdfText = createPdfTextExtractor({
      timeoutMs: 5,
      workerFactory: () => {
        worker = createFakeWorker(() => undefined);
        return worker;
      },
    });

    await expect(extractPdfText("resume.pdf")).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});

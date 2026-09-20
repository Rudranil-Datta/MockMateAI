import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createPdfTextExtractor } from "../../src/services/pdfTextExtractor.js";
import { createTestPdf } from "../helpers/createTestPdf.js";

const temporaryDirectories = [];

afterEach(async () => {
  vi.useRealTimers();
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
  it("uses the documented default extraction and worker resource limits", async () => {
    const workerFactory = vi.fn(() =>
      createFakeWorker((worker) => {
        worker.emit("message", { ok: true, text: "Backend Engineer" });
      }),
    );
    const extractPdfText = createPdfTextExtractor({ workerFactory });

    await extractPdfText("/private/resume.pdf");

    expect(workerFactory).toHaveBeenCalledWith({
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
      workerData: {
        maxFileSizeBytes: 5 * 1024 * 1024,
        maxPages: 20,
        maxTextLength: 50_000,
        path: "/private/resume.pdf",
      },
    });
  });

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

  it("rejects malformed, empty-text, and over-page PDFs in the real worker", async () => {
    const malformedPath = await createTemporaryPdf(
      Buffer.from("%PDF-1.7\nnot a complete PDF"),
    );
    const emptyPath = await createTemporaryPdf(createTestPdf(""));
    const overPagePath = await createTemporaryPdf(
      createTestPdf((page) => `Page ${page}`, { pageCount: 2 }),
    );
    const extractPdfText = createPdfTextExtractor({ maxPages: 1 });

    await expect(extractPdfText(malformedPath)).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(extractPdfText(emptyPath)).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(extractPdfText(overPagePath)).rejects.toThrow(
      "PDF text could not be extracted.",
    );
  });

  it("bounds large real-worker text output", async () => {
    const path = await createTemporaryPdf(createTestPdf("x".repeat(20_000)));
    const extractPdfText = createPdfTextExtractor({ maxTextLength: 100 });

    const text = await extractPdfText(path);

    expect(text).toMatch(/^x+$/);
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(100);
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
    const resourceExtractor = createPdfTextExtractor({
      workerFactory: () =>
        createFakeWorker((worker) => {
          const error = new Error(
            "Worker terminated due to reaching memory limit",
          );
          error.code = "ERR_WORKER_OUT_OF_MEMORY";
          worker.emit("error", error);
        }),
    });

    await expect(errorExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(exitExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
    await expect(resourceExtractor("resume.pdf")).rejects.toThrow(
      "PDF text could not be extracted.",
    );
  });

  it("waits for hard worker termination before reporting timeout", async () => {
    vi.useFakeTimers();
    let worker;
    let finishTermination;
    const extractPdfText = createPdfTextExtractor({
      workerFactory: () => {
        worker = createFakeWorker(() => undefined);
        worker.terminate = vi.fn(
          () =>
            new Promise((resolve) => {
              finishTermination = resolve;
            }),
        );
        return worker;
      },
    });
    const outcome = extractPdfText("resume.pdf").then(
      () => "resolved",
      (error) => error,
    );

    await vi.advanceTimersByTimeAsync(5000);
    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(
      Promise.race([outcome, Promise.resolve("still-pending")]),
    ).resolves.toBe("still-pending");

    finishTermination(1);
    await expect(outcome).resolves.toMatchObject({
      name: "TimeoutError",
    });
  });
});

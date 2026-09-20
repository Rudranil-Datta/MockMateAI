import { Worker } from "node:worker_threads";

const defaultMaxFileSizeBytes = 5 * 1024 * 1024;
const defaultMaxPages = 20;
const defaultMaxTextLength = 50_000;
const defaultTimeoutMs = 5_000;
const workerUrl = new URL("./pdfTextWorker.js", import.meta.url);

function extractionFailure() {
  return new Error("PDF text could not be extracted.");
}

function extractionTimeout() {
  const error = new Error("PDF extraction timed out.");
  error.name = "TimeoutError";
  return error;
}

function defaultWorkerFactory(options) {
  return new Worker(workerUrl, options);
}

export function createPdfTextExtractor({
  maxFileSizeBytes = defaultMaxFileSizeBytes,
  maxPages = defaultMaxPages,
  maxTextLength = defaultMaxTextLength,
  timeoutMs = defaultTimeoutMs,
  workerFactory = defaultWorkerFactory,
} = {}) {
  return async function extractPdfText(path) {
    const worker = workerFactory({
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
      workerData: {
        maxFileSizeBytes,
        maxPages,
        maxTextLength,
        path,
      },
    });

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const settle = async (result, error) => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        clearTimeout(timeout);
        await worker.terminate().catch(() => undefined);

        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      };

      const timeout = setTimeout(() => {
        void settle(undefined, extractionTimeout());
      }, timeoutMs);

      worker.once("message", (message) => {
        if (
          message?.ok !== true ||
          typeof message.text !== "string" ||
          !message.text ||
          message.text.length > maxTextLength
        ) {
          void settle(undefined, extractionFailure());
          return;
        }

        void settle(message.text);
      });
      worker.once("error", () => {
        void settle(undefined, extractionFailure());
      });
      worker.once("exit", () => {
        if (!isSettled) {
          void settle(undefined, extractionFailure());
        }
      });
    });
  };
}

export const extractPdfText = createPdfTextExtractor();

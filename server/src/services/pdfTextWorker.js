import { readFile, stat } from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";

import { PDFParse } from "pdf-parse";

function normalizeExtractedText(text, maxTextLength) {
  return text
    .replaceAll("\u0000", "")
    .replaceAll(/[^\S\r\n]+/g, " ")
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxTextLength);
}

async function extract() {
  const { maxFileSizeBytes, maxPages, maxTextLength, path } = workerData;
  const fileStats = await stat(path);

  if (fileStats.size < 1 || fileStats.size > maxFileSizeBytes) {
    throw new Error("PDF file size is outside extraction limits.");
  }

  const data = await readFile(path);
  const parser = new PDFParse({
    data,
    isEvalSupported: false,
    maxImageSize: 0,
    stopAtErrors: true,
  });

  try {
    const result = await parser.getText({
      first: maxPages,
      pageJoiner: "\n",
    });
    const text = normalizeExtractedText(result?.text || "", maxTextLength);

    if (!text) {
      throw new Error("PDF contains no extractable text.");
    }

    parentPort.postMessage({ ok: true, text });
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

extract().catch(() => {
  parentPort.postMessage({ ok: false });
});

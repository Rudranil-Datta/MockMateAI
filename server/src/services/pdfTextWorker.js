import { parentPort, workerData } from "node:worker_threads";

import { extractBoundedPdfText } from "./pdfTextParser.js";

async function extract() {
  const text = await extractBoundedPdfText(workerData);
  parentPort.postMessage({ ok: true, text });
}

extract().catch(() => {
  parentPort.postMessage({ ok: false });
});

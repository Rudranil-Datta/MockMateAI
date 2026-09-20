import {
  readFile as defaultReadFile,
  stat as defaultStat,
} from "node:fs/promises";

import { PDFParse } from "pdf-parse";

function createParser(data) {
  return new PDFParse({
    data,
    isEvalSupported: false,
    maxImageSize: 0,
    stopAtErrors: true,
  });
}

function normalizeExtractedText(text) {
  return text
    .replaceAll("\u0000", "")
    .replaceAll(/[^\S\r\n]+/g, " ")
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractBoundedPdfText(
  { maxFileSizeBytes, maxPages, maxTextLength, path },
  {
    createParser: parserFactory = createParser,
    readFile = defaultReadFile,
    stat = defaultStat,
  } = {},
) {
  const fileStats = await stat(path);

  if (fileStats.size < 1 || fileStats.size > maxFileSizeBytes) {
    throw new Error("PDF file size is outside extraction limits.");
  }

  const data = await readFile(path);
  const parser = parserFactory(data);

  try {
    const info = await parser.getInfo();

    if (
      !Number.isInteger(info?.total) ||
      info.total < 1 ||
      info.total > maxPages
    ) {
      throw new Error("PDF page count is outside extraction limits.");
    }

    let extractedText = "";

    for (let page = 1; page <= info.total; page += 1) {
      const result = await parser.getText({ pageJoiner: "", partial: [page] });
      const pageText = normalizeExtractedText(result?.text || "");

      if (!pageText) {
        continue;
      }

      const separator = extractedText ? "\n\n" : "";
      const remainingLength = maxTextLength - extractedText.length;
      extractedText += `${separator}${pageText}`.slice(0, remainingLength);

      if (extractedText.length >= maxTextLength) {
        break;
      }
    }

    if (!extractedText) {
      throw new Error("PDF contains no extractable text.");
    }

    return extractedText.trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

import { describe, expect, it, vi } from "vitest";

import { extractBoundedPdfText } from "../../src/services/pdfTextParser.js";

function createDependencies({
  pages = [],
  size = 128,
  total = pages.length,
} = {}) {
  const parser = {
    destroy: vi.fn().mockResolvedValue(undefined),
    getInfo: vi.fn().mockResolvedValue({ total }),
    getText: vi.fn(({ partial }) =>
      Promise.resolve({ text: pages[partial[0] - 1] ?? "" }),
    ),
  };

  return {
    dependencies: {
      createParser: vi.fn(() => parser),
      readFile: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7")),
      stat: vi.fn().mockResolvedValue({ size }),
    },
    parser,
  };
}

describe("pdfTextParser", () => {
  it.each([0, 1025])(
    "rejects file size %s before parser creation",
    async (size) => {
      const { dependencies } = createDependencies({ size });

      await expect(
        extractBoundedPdfText(
          {
            maxFileSizeBytes: 1024,
            maxPages: 2,
            maxTextLength: 20,
            path: "/private/resume.pdf",
          },
          dependencies,
        ),
      ).rejects.toThrow();
      expect(dependencies.readFile).not.toHaveBeenCalled();
      expect(dependencies.createParser).not.toHaveBeenCalled();
    },
  );

  it("checks page count before extracting normalized text page by page", async () => {
    const { dependencies, parser } = createDependencies({
      pages: ["  Backend\u0000   Engineer  ", "Node\r\n\r\n\r\nMongoDB"],
    });

    await expect(
      extractBoundedPdfText(
        {
          maxFileSizeBytes: 1024,
          maxPages: 2,
          maxTextLength: 100,
          path: "/private/resume.pdf",
        },
        dependencies,
      ),
    ).resolves.toBe("Backend Engineer\n\nNode\n\nMongoDB");
    expect(parser.getInfo).toHaveBeenCalledOnce();
    expect(parser.getText.mock.calls).toEqual([
      [{ pageJoiner: "", partial: [1] }],
      [{ pageJoiner: "", partial: [2] }],
    ]);
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("rejects over-page documents before text extraction", async () => {
    const { dependencies, parser } = createDependencies({
      pages: ["one", "two", "three"],
      total: 3,
    });

    await expect(
      extractBoundedPdfText(
        {
          maxFileSizeBytes: 1024,
          maxPages: 2,
          maxTextLength: 100,
          path: "/private/resume.pdf",
        },
        dependencies,
      ),
    ).rejects.toThrow();
    expect(parser.getText).not.toHaveBeenCalled();
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("stops page processing as soon as normalized text reaches its cap", async () => {
    const { dependencies, parser } = createDependencies({
      pages: ["12345678", "ABCDEFGHIJ", "must not parse"],
    });

    await expect(
      extractBoundedPdfText(
        {
          maxFileSizeBytes: 1024,
          maxPages: 3,
          maxTextLength: 12,
          path: "/private/resume.pdf",
        },
        dependencies,
      ),
    ).resolves.toBe("12345678\n\nAB");
    expect(parser.getText).toHaveBeenCalledTimes(2);
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("rejects image-only or empty-text documents", async () => {
    const { dependencies, parser } = createDependencies({
      pages: [" \u0000 ", "\r\n"],
    });

    await expect(
      extractBoundedPdfText(
        {
          maxFileSizeBytes: 1024,
          maxPages: 2,
          maxTextLength: 100,
          path: "/private/resume.pdf",
        },
        dependencies,
      ),
    ).rejects.toThrow();
    expect(parser.destroy).toHaveBeenCalledOnce();
  });
});

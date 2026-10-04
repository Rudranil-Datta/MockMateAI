import { describe, expect, it, vi } from "vitest";

import { createAiProviderService } from "../../src/services/aiProviderService.js";

const draft = {
  architecture: ["React client with an Express API"],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: ["Built and tested the interview workflow"],
  role: "Full-stack developer",
  summary: "An interview preparation application with structured feedback.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
};

describe("project extraction provider contract", () => {
  it("supports deterministic mock extraction", async () => {
    const service = createAiProviderService({ aiProvider: "mock" });
    await expect(
      service.extractProjectDrafts({
        resumeContext: "Project experience with JavaScript and APIs.",
      }),
    ).resolves.toMatchObject({ drafts: expect.any(Array) });
  });

  it("uses one bounded structured Gemini operation", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValue({ text: JSON.stringify({ drafts: [draft] }) });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });
    await expect(
      service.extractProjectDrafts({
        resumeContext: "Built MockMateAI using React and Node.js.",
      }),
    ).resolves.toEqual({ drafts: [draft] });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][0].config).toMatchObject({
      maxOutputTokens: 3000,
      responseMimeType: "application/json",
    });
  });

  it.each([
    { drafts: [{ ...draft, extra: true }] },
    { drafts: [{ ...draft, technologies: ["React", "react"] }] },
    { drafts: Array.from({ length: 6 }, () => draft) },
    { drafts: [{ ...draft, claims: [{ evidence: "x", text: "Claim" }] }] },
  ])("rejects malformed provider output", async (output) => {
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi
        .fn()
        .mockResolvedValue({ text: JSON.stringify(output) }),
    });
    await expect(
      service.extractProjectDrafts({
        resumeContext: "Built a sufficiently described project.",
      }),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
  });
});

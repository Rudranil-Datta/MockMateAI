import { describe, expect, it, vi } from "vitest";

import { createAiProviderService } from "../../src/services/aiProviderService.js";

const draft = {
  architecture: [],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: [],
  role: null,
  summary: "Built MockMateAI using React and Node.js.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
  missingFields: [
    "role",
    "responsibilities",
    "architecture",
    "decisions",
    "tradeoffs",
    "claims",
  ],
};
const resumeContext = "Built MockMateAI using React and Node.js.";

function expectCompatibleResponseSchema(value) {
  if (Array.isArray(value)) {
    value.forEach(expectCompatibleResponseSchema);
    return;
  }

  if (!value || typeof value !== "object") return;
  expect(value).not.toHaveProperty("nullable");
  expect(value).not.toHaveProperty("minLength");
  expect(value).not.toHaveProperty("maxLength");
  expect(value).not.toHaveProperty("minItems");
  expect(value).not.toHaveProperty("maxItems");
  Object.values(value).forEach(expectCompatibleResponseSchema);
}

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
        resumeContext,
      }),
    ).resolves.toEqual({ drafts: [draft] });
    expect(generateContent).toHaveBeenCalledTimes(1);
    const config = generateContent.mock.calls[0][0].config;
    expect(config).toMatchObject({
      maxOutputTokens: 3000,
      responseMimeType: "application/json",
    });
    expectCompatibleResponseSchema(config.responseJsonSchema);
    expect(
      config.responseJsonSchema.properties.drafts.items.properties.claims.items
        .properties.evidence.type,
    ).toEqual(["string", "null"]);
  });

  it("retries one malformed extraction response before returning drafts", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({
          drafts: [{ ...draft, name: "Invented Project" }],
        }),
      })
      .mockResolvedValueOnce({ text: JSON.stringify({ drafts: [draft] }) });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      random: () => 0,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      service.extractProjectDrafts({ resumeContext }),
    ).resolves.toEqual({
      drafts: [draft],
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    { drafts: [{ ...draft, extra: true }] },
    { drafts: [{ ...draft, technologies: ["React", "react"] }] },
    { drafts: Array.from({ length: 6 }, () => draft) },
    { drafts: [{ ...draft, claims: [{ evidence: "x", text: "Claim" }] }] },
    { drafts: [{ ...draft, name: "Invented Project" }] },
    { drafts: [{ ...draft, missingFields: ["role"] }] },
  ])("rejects malformed provider output", async (output) => {
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi
        .fn()
        .mockResolvedValue({ text: JSON.stringify(output) }),
    });
    await expect(
      service.extractProjectDrafts({
        resumeContext,
      }),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
  });
});

import { describe, expect, it, vi } from "vitest";

import { createAiProviderService } from "../../src/services/aiProviderService.js";

const input = {
  company: "Example",
  description:
    "Build secure Node.js APIs with MongoDB and strong testing practices. ".repeat(
      2,
    ),
  title: "Backend Engineer",
};
const analysis = {
  requirements: [
    {
      evidenceTerms: ["Node.js APIs"],
      key: "backend-development",
      label: "Backend development",
      priority: "required",
    },
  ],
  roleSummary:
    "Build and operate secure backend services with reliable engineering practices.",
  skills: [
    {
      key: "node-js",
      label: "Node.js",
      sourceRequirementKeys: ["backend-development"],
      weight: 5,
    },
  ],
};

describe("Job Target provider contract", () => {
  it("supports deterministic mock analysis", async () => {
    const service = createAiProviderService({ aiProvider: "mock" });
    await expect(service.analyzeJobTarget(input)).resolves.toMatchObject({
      requirements: expect.any(Array),
      skills: expect.any(Array),
    });
  });

  it("uses bounded structured Gemini output without caching or retry", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(analysis),
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      timeoutMs: 5000,
    });

    await expect(service.analyzeJobTarget(input)).resolves.toEqual(analysis);
    await expect(service.analyzeJobTarget(input)).resolves.toEqual(analysis);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          maxOutputTokens: 1600,
          responseMimeType: "application/json",
        }),
      }),
    );
  });

  it.each([
    { ...analysis, extra: true },
    { ...analysis, requirements: [] },
    {
      ...analysis,
      requirements: [...analysis.requirements, { ...analysis.requirements[0] }],
    },
    {
      ...analysis,
      skills: [{ ...analysis.skills[0], sourceRequirementKeys: ["unknown"] }],
    },
  ])("rejects malformed analysis", async (output) => {
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi
        .fn()
        .mockResolvedValue({ text: JSON.stringify(output) }),
    });
    await expect(service.analyzeJobTarget(input)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
      status: 502,
    });
  });

  it("rejects invalid input before provider work", async () => {
    const generateContent = vi.fn();
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });
    await expect(
      service.analyzeJobTarget({ ...input, description: "short" }),
    ).rejects.toMatchObject({ code: "INVALID_AI_REQUEST", status: 400 });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects analysis exceeding the 12 KiB serialized cap", async () => {
    const requirements = Array.from({ length: 12 }, (_, index) => ({
      evidenceTerms: Array.from({ length: 5 }, () => "😀".repeat(40)),
      key: `requirement-${index}`,
      label: "😀".repeat(40),
      priority: "required",
    }));
    const output = {
      requirements,
      roleSummary: "😀".repeat(250),
      skills: requirements.map(({ key }, index) => ({
        key: `skill-${index}`,
        label: "😀".repeat(40),
        sourceRequirementKeys: [key],
        weight: 5,
      })),
    };
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi
        .fn()
        .mockResolvedValue({ text: JSON.stringify(output) }),
    });

    await expect(service.analyzeJobTarget(input)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
    });
  });
});

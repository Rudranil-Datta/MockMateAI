const challengeAxesByTopic = {
  architecture: [
    "architecture",
    "data",
    "security",
    "deployment",
    "failure-scenario",
  ],
  "claimed-results": ["testing", "failure-scenario"],
  decisions: ["data", "security", "trade-off"],
  responsibilities: ["testing", "deployment", "failure-scenario"],
  "technology-choices": ["technology", "testing", "security", "trade-off"],
  tradeoffs: ["trade-off", "failure-scenario"],
};

const factKeyByTopic = {
  architecture: "architecture",
  "claimed-results": "claims",
  decisions: "decisions",
  responsibilities: "responsibilities",
  "technology-choices": "technologies",
  tradeoffs: "tradeoffs",
};

export const projectChallengeAxes = [
  "architecture",
  "technology",
  "data",
  "security",
  "testing",
  "deployment",
  "trade-off",
  "failure-scenario",
];

export function deriveProjectChallengeDirective({
  facts,
  latestAnswer,
  latestTopicKey,
  previousQuestionCount,
}) {
  const factKey = factKeyByTopic[latestTopicKey];
  const axes = challengeAxesByTopic[latestTopicKey];
  const entries = factKey ? facts?.[factKey] : null;
  if (
    !axes ||
    !Array.isArray(entries) ||
    entries.length === 0 ||
    typeof latestAnswer !== "string" ||
    !latestAnswer.trim() ||
    !Number.isInteger(previousQuestionCount) ||
    previousQuestionCount < 1
  ) {
    return null;
  }

  const index = (previousQuestionCount - 1) % entries.length;
  const entry = entries[index];
  const anchorText = factKey === "claims" ? entry?.text : entry;
  if (typeof anchorText !== "string" || !anchorText.trim()) return null;

  return {
    anchorKey: `${factKey}:${index}`,
    anchorText: anchorText.trim(),
    axis: axes[(previousQuestionCount - 1) % axes.length],
    latestAnswer: latestAnswer.trim().slice(0, 2000),
  };
}

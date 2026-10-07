export const projectCoverageDefinitions = [
  ["architecture", "Architecture", "architecture"],
  ["technology-choices", "Technology choices", "technologies"],
  ["responsibilities", "Responsibilities", "responsibilities"],
  ["decisions", "Decisions", "decisions"],
  ["tradeoffs", "Trade-offs", "tradeoffs"],
  ["claimed-results", "Claimed results", "claims"],
];

export function roleCoveragePlan(snapshot) {
  return snapshot.analysis.skills
    .map((skill, index) => ({ index, skill }))
    .sort(
      (left, right) =>
        right.skill.weight - left.skill.weight || left.index - right.index,
    )
    .map(({ skill }) => ({
      label: skill.label,
      skillKeys: [skill.key],
      topicKey: skill.key,
    }));
}

export function projectCoveragePlan(snapshot) {
  return projectCoverageDefinitions
    .filter(([, , factKey]) => snapshot.facts[factKey].length > 0)
    .map(([topicKey, label]) => ({
      label,
      skillKeys: [topicKey],
      topicKey,
    }));
}

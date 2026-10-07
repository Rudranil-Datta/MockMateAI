import { apiRequest } from "./httpClient.js";

function malformed() {
  const error = new Error("Coach tree returned an unexpected response. Please try again.");
  error.code = "COACH_MALFORMED_RESPONSE";
  return error;
}

function query({ context, projectId, targetId }) {
  const value = new URLSearchParams({ context });
  if (context === "target") value.set("targetId", targetId || "");
  if (context === "project") value.set("projectId", projectId || "");
  return value.toString();
}

function hasOnly(object, keys) {
  return Object.keys(object).every((key) => keys.includes(key));
}

const masteryLabels = new Set(["needs_work", "developing", "capable", "strong"]);

export async function getCoachTree({ context = "overall", projectId, signal, targetId } = {}) {
  const tree = await apiRequest(`coach/tree?${query({ context, projectId, targetId })}`, { signal });
  if (!tree || typeof tree !== "object" || Array.isArray(tree) || !hasOnly(tree, ["context", "edges", "evidenceSyncStatus", "nodes", "omittedSkillCount"]) || !tree.context || typeof tree.context !== "object" || Array.isArray(tree.context) || !hasOnly(tree.context, ["kind", "label"]) || !["overall", "job_target", "candidate_project"].includes(tree.context.kind) || typeof tree.context.label !== "string" || !tree.context.label.trim() || tree.context.label.length > 160 || !Array.isArray(tree.nodes) || !Array.isArray(tree.edges) || tree.nodes.length < 1 || tree.nodes.length > 25 || tree.edges.length > 24 || !Number.isInteger(tree.omittedSkillCount) || tree.omittedSkillCount < 0 || !["ready", "pending"].includes(tree.evidenceSyncStatus)) throw malformed();
  const ids = new Set();
  const nodesById = new Map();
  for (const node of tree.nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node) || typeof node.id !== "string" || !node.id || node.id.length > 140 || ids.has(node.id) || !["context", "branch", "skill"].includes(node.kind) || typeof node.label !== "string" || !node.label.trim() || node.label.length > 160) throw malformed();
    if (node.kind !== "skill" && !hasOnly(node, ["id", "kind", "label"])) throw malformed();
    if (node.kind === "skill" && (!hasOnly(node, ["confidence", "evidenceCount", "id", "kind", "label", "masteryLabel", "masteryScore", "replayTo", "skillKey", "skillLabel"]) || typeof node.skillKey !== "string" || !node.skillKey || node.skillKey.length > 100 || node.skillLabel !== node.label || !Number.isInteger(node.evidenceCount) || node.evidenceCount < 0 || node.evidenceCount > 20 || !["no_evidence", "provisional", "emerging", "established"].includes(node.confidence) || (node.masteryLabel !== null && !masteryLabels.has(node.masteryLabel)) || (node.masteryScore !== null && (!Number.isInteger(node.masteryScore) || node.masteryScore < 0 || node.masteryScore > 100)) || (node.evidenceCount === 0 ? node.confidence !== "no_evidence" || node.masteryLabel !== null || node.masteryScore !== null : node.confidence === "no_evidence" || node.masteryLabel === null || node.masteryScore === null) || (node.replayTo !== null && !/^\/practice\/[a-f0-9]{24}\/results$/.test(node.replayTo)))) throw malformed();
    ids.add(node.id);
    nodesById.set(node.id, node);
  }
  const edges = new Set();
  if (!tree.edges.every((edge) => {
    const key = `${edge?.from}:${edge?.to}`;
    const from = nodesById.get(edge?.from);
    const to = nodesById.get(edge?.to);
    if (!edge || typeof edge !== "object" || Array.isArray(edge) || !hasOnly(edge, ["from", "to"]) || !from || !to || from.id === to.id || edges.has(key) || !((from.kind === "context" && to.kind === "branch") || (from.kind === "branch" && to.kind === "skill"))) return false;
    edges.add(key);
    return true;
  })) throw malformed();
  const expectedContextKind = { overall: "overall", project: "candidate_project", target: "job_target" }[context];
  if (!expectedContextKind || tree.context.kind !== expectedContextKind || !tree.nodes.some((node) => node.id === "context" && node.kind === "context") || tree.nodes.filter((node) => node.kind === "context").length !== 1) throw malformed();
  return tree;
}

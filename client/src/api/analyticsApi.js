import { apiRequest } from "./httpClient.js";

const interviewTypes = ["DSA", "HR", "System Design"];
const interviewLevels = new Set(["beginner", "intermediate", "advanced"]);
const maxRecentSessions = 10;

function hasExactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function isIsoDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isSafeSummary(summary) {
  return (
    hasExactKeys(summary, [
      "averageAccuracyScore",
      "averageClarityScore",
      "averageConfidenceScore",
      "averageOverallScore",
      "completedSessions",
    ]) &&
    isScore(summary.averageAccuracyScore) &&
    isScore(summary.averageClarityScore) &&
    isScore(summary.averageConfidenceScore) &&
    isScore(summary.averageOverallScore) &&
    Number.isSafeInteger(summary.completedSessions) &&
    summary.completedSessions >= 0
  );
}

function isSafeTypeAverages(typeAverages) {
  if (!Array.isArray(typeAverages) || typeAverages.length > 3) {
    return false;
  }

  let previousTypeIndex = -1;

  return typeAverages.every((entry) => {
    const typeIndex = interviewTypes.indexOf(entry?.interviewType);
    const isSafe =
      hasExactKeys(entry, ["averageOverallScore", "interviewType"]) &&
      isScore(entry.averageOverallScore) &&
      typeIndex > previousTypeIndex;

    previousTypeIndex = typeIndex;
    return isSafe;
  });
}

function isSafeRecentSessions(recentSessions) {
  if (
    !Array.isArray(recentSessions) ||
    recentSessions.length > maxRecentSessions
  ) {
    return false;
  }

  const ids = new Set();

  return recentSessions.every((session, index) => {
    if (
      !hasExactKeys(session, [
        "completedAt",
        "id",
        "interviewType",
        "level",
        "overallScore",
      ]) ||
      typeof session.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(session.id) ||
      ids.has(session.id) ||
      !interviewTypes.includes(session.interviewType) ||
      !interviewLevels.has(session.level) ||
      !isIsoDate(session.completedAt) ||
      !isScore(session.overallScore)
    ) {
      return false;
    }

    ids.add(session.id);
    const previous = recentSessions[index - 1];

    return (
      !previous ||
      previous.completedAt > session.completedAt ||
      (previous.completedAt === session.completedAt &&
        previous.id.localeCompare(session.id) > 0)
    );
  });
}

function isSafeTrend(trend, recentSessions) {
  if (!Array.isArray(trend) || trend.length !== recentSessions.length) {
    return false;
  }

  const expected = [...recentSessions].reverse();

  return trend.every(
    (point, index) =>
      hasExactKeys(point, ["completedAt", "overallScore"]) &&
      isIsoDate(point.completedAt) &&
      isScore(point.overallScore) &&
      point.completedAt === expected[index].completedAt &&
      point.overallScore === expected[index].overallScore,
  );
}

export function isSafeAnalyticsSummary(analytics) {
  if (
    !hasExactKeys(analytics, [
      "recentSessions",
      "summary",
      "trend",
      "typeAverages",
    ]) ||
    !isSafeSummary(analytics.summary) ||
    !isSafeTypeAverages(analytics.typeAverages) ||
    !isSafeRecentSessions(analytics.recentSessions) ||
    !isSafeTrend(analytics.trend, analytics.recentSessions)
  ) {
    return false;
  }

  const { completedSessions } = analytics.summary;
  const isEmpty = completedSessions === 0;

  return isEmpty
    ? analytics.recentSessions.length === 0 &&
        analytics.trend.length === 0 &&
        analytics.typeAverages.length === 0 &&
        analytics.summary.averageAccuracyScore === 0 &&
        analytics.summary.averageClarityScore === 0 &&
        analytics.summary.averageConfidenceScore === 0 &&
        analytics.summary.averageOverallScore === 0
    : analytics.recentSessions.length >= 1 &&
        analytics.recentSessions.length <= completedSessions &&
        analytics.typeAverages.length >= 1;
}

export async function getAnalyticsSummary({ signal } = {}) {
  const analytics = await apiRequest("analytics/summary", { signal });

  if (!isSafeAnalyticsSummary(analytics)) {
    throw new Error("Dashboard data could not be loaded. Please try again.");
  }

  return analytics;
}

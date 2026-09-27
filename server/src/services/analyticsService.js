import mongoose from "mongoose";

import InterviewSession from "../models/InterviewSession.js";

const recentSessionLimit = 10;
const supportedInterviewTypes = ["DSA", "HR", "System Design"];
const supportedLevels = ["beginner", "intermediate", "advanced"];

const validScoreMatch = {
  $gte: 0,
  $lte: 100,
  $type: "number",
};

function roundScore(score) {
  return Math.round(score);
}

function emptySummary() {
  return {
    averageAccuracyScore: 0,
    averageClarityScore: 0,
    averageConfidenceScore: 0,
    averageOverallScore: 0,
    completedSessions: 0,
  };
}

export function createAnalyticsService({
  interviewSessionModel = InterviewSession,
} = {}) {
  return {
    async getSummary({ userId }) {
      const ownerId = new mongoose.Types.ObjectId(userId);
      const [result = {}] = await interviewSessionModel.aggregate([
        {
          $match: {
            completedAt: { $type: "date" },
            interviewType: { $in: supportedInterviewTypes },
            level: { $in: supportedLevels },
            "summary.accuracyScore": validScoreMatch,
            "summary.clarityScore": validScoreMatch,
            "summary.confidenceScore": validScoreMatch,
            "summary.overallScore": validScoreMatch,
            status: "completed",
            userId: ownerId,
          },
        },
        {
          $facet: {
            recentSessions: [
              { $sort: { completedAt: -1, _id: -1 } },
              { $limit: recentSessionLimit },
              {
                $project: {
                  completedAt: 1,
                  interviewType: 1,
                  level: 1,
                  overallScore: "$summary.overallScore",
                },
              },
            ],
            summary: [
              {
                $group: {
                  _id: null,
                  averageAccuracyScore: { $avg: "$summary.accuracyScore" },
                  averageClarityScore: { $avg: "$summary.clarityScore" },
                  averageConfidenceScore: {
                    $avg: "$summary.confidenceScore",
                  },
                  averageOverallScore: { $avg: "$summary.overallScore" },
                  completedSessions: { $sum: 1 },
                },
              },
            ],
            typeAverages: [
              {
                $group: {
                  _id: "$interviewType",
                  averageOverallScore: { $avg: "$summary.overallScore" },
                },
              },
            ],
          },
        },
      ]);

      const aggregateSummary = result.summary?.[0];
      const summary = aggregateSummary
        ? {
            averageAccuracyScore: roundScore(
              aggregateSummary.averageAccuracyScore,
            ),
            averageClarityScore: roundScore(
              aggregateSummary.averageClarityScore,
            ),
            averageConfidenceScore: roundScore(
              aggregateSummary.averageConfidenceScore,
            ),
            averageOverallScore: roundScore(
              aggregateSummary.averageOverallScore,
            ),
            completedSessions: aggregateSummary.completedSessions,
          }
        : emptySummary();
      const recentSessions = (result.recentSessions || []).map((session) => ({
        completedAt: session.completedAt.toISOString(),
        id: session._id.toString(),
        interviewType: session.interviewType,
        level: session.level,
        overallScore: session.overallScore,
      }));
      const typeAverages = (result.typeAverages || [])
        .map((entry) => ({
          averageOverallScore: roundScore(entry.averageOverallScore),
          interviewType: entry._id,
        }))
        .sort(
          (left, right) =>
            supportedInterviewTypes.indexOf(left.interviewType) -
            supportedInterviewTypes.indexOf(right.interviewType),
        );

      return {
        recentSessions,
        summary,
        trend: recentSessions
          .map(({ completedAt, overallScore }) => ({
            completedAt,
            overallScore,
          }))
          .reverse(),
        typeAverages,
      };
    },
  };
}

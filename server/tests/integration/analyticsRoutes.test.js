import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import { createAnalyticsService } from "../../src/services/analyticsService.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const app = createApp();

useMongoTestDatabase();

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

async function signup(index = 0) {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({
      email: `analytics-${index}@example.com`,
      name: `Analytics User ${index}`,
      password: "secure-password-123",
    });

  return { cookie: getSessionCookie(response), user: response.body.user };
}

function completedSessionInput({
  completedAt,
  interviewType,
  level = "intermediate",
  score,
  userId,
}) {
  const startedAt = new Date(completedAt.getTime() - 60_000);

  return {
    completedAt,
    interviewType,
    level,
    questions: [
      {
        answers: [
          {
            evaluationStatus: "completed",
            feedback: {
              accuracyScore: score + 10,
              clarityScore: score - 10,
              confidenceScore: score + 20,
              evaluatedAt: completedAt,
              improvements: ["Add detail."],
              nextStep: "Practise again.",
              overallScore: score,
              strengths: ["Clear structure."],
            },
            inputMode: "text",
            submittedAt: completedAt,
            text: "Completed answer.",
          },
        ],
        generatedAt: startedAt,
        order: 1,
        prompt: "Answer this question.",
      },
    ],
    startedAt,
    status: "completed",
    summary: {
      accuracyScore: score + 10,
      clarityScore: score - 10,
      confidenceScore: score + 20,
      improvements: ["Add detail."],
      overallScore: score,
      recommendation: "Practise again.",
      strengths: ["Clear structure."],
    },
    userId,
  };
}

describe("analytics summary route", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/analytics/summary");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns a stable empty response when no valid completed session exists", async () => {
    const { cookie, user } = await signup();
    await InterviewSession.create({
      interviewType: "DSA",
      level: "beginner",
      questions: [],
      status: "created",
      userId: user.id,
    });

    const response = await request(app)
      .get("/api/analytics/summary")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      recentSessions: [],
      summary: {
        averageAccuracyScore: 0,
        averageClarityScore: 0,
        averageConfidenceScore: 0,
        averageOverallScore: 0,
        completedSessions: 0,
      },
      trend: [],
      typeAverages: [],
    });
  });

  it("returns bounded owner-only aggregates with stable ordering and safe fields", async () => {
    const { cookie, user } = await signup();
    const foreign = await signup(1);
    const interviewTypes = ["DSA", "HR", "System Design"];
    const sessions = [];

    for (let index = 0; index < 12; index += 1) {
      const day = index === 11 ? 11 : index + 1;
      sessions.push(
        await InterviewSession.create(
          completedSessionInput({
            completedAt: new Date(Date.UTC(2026, 0, day)),
            interviewType: interviewTypes[index % interviewTypes.length],
            score: 50 + index,
            userId: user.id,
          }),
        ),
      );
    }
    await InterviewSession.create(
      completedSessionInput({
        completedAt: new Date(Date.UTC(2026, 1, 1)),
        interviewType: "DSA",
        score: 80,
        userId: foreign.user.id,
      }),
    );
    await InterviewSession.collection.insertOne({
      completedAt: new Date(Date.UTC(2026, 1, 2)),
      interviewType: "HR",
      level: "beginner",
      status: "completed",
      summary: { overallScore: 99 },
      userId: new mongoose.Types.ObjectId(user.id),
    });

    const response = await request(app)
      .get("/api/analytics/summary")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({
      averageAccuracyScore: 66,
      averageClarityScore: 46,
      averageConfidenceScore: 76,
      averageOverallScore: 56,
      completedSessions: 12,
    });
    expect(response.body.typeAverages).toEqual([
      { averageOverallScore: 55, interviewType: "DSA" },
      { averageOverallScore: 56, interviewType: "HR" },
      { averageOverallScore: 57, interviewType: "System Design" },
    ]);
    expect(response.body.recentSessions).toHaveLength(10);
    expect(
      response.body.recentSessions.map(({ overallScore }) => overallScore),
    ).toEqual([61, 60, 59, 58, 57, 56, 55, 54, 53, 52]);
    expect(
      response.body.recentSessions.slice(0, 2).map(({ id }) => id),
    ).toEqual([sessions[11].id, sessions[10].id]);
    expect(Object.keys(response.body.recentSessions[0]).sort()).toEqual(
      ["completedAt", "id", "interviewType", "level", "overallScore"].sort(),
    );
    expect(response.body.trend.map(({ overallScore }) => overallScore)).toEqual(
      [52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
    );
    expect(response.body.trend[0]).toEqual({
      completedAt: "2026-01-03T00:00:00.000Z",
      overallScore: 52,
    });

    const foreignResponse = await request(app)
      .get("/api/analytics/summary")
      .set("Cookie", foreign.cookie);

    expect(foreignResponse.body.typeAverages).toEqual([
      { averageOverallScore: 80, interviewType: "DSA" },
    ]);
  });

  it("maps an aggregation failure to the existing safe error response", async () => {
    const { cookie } = await signup();
    const aggregate = vi
      .fn()
      .mockRejectedValue(new Error("private database detail"));
    const failureApp = createApp({
      analyticsService: createAnalyticsService({
        interviewSessionModel: { aggregate },
      }),
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      const response = await request(failureApp)
        .get("/api/analytics/summary")
        .set("Cookie", cookie);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("private database");
      expect(aggregate).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });
});

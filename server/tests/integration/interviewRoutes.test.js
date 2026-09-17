import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import InterviewSession, {
  maxQuestionsPerInterview,
} from "../../src/models/InterviewSession.js";
import { AppError } from "../../src/utils/AppError.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const app = createApp();
const validSignup = {
  email: "asha.kumar@example.com",
  name: "Asha Kumar",
  password: "secure-password-123",
};

useMongoTestDatabase();

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

async function signup(credentials = validSignup) {
  const response = await request(app)
    .post("/api/auth/signup")
    .send(credentials);

  return { cookie: getSessionCookie(response), user: response.body.user };
}

async function startInterview(cookie, input = {}) {
  return request(app)
    .post("/api/interviews")
    .set("Cookie", cookie)
    .send({ interviewType: "DSA", level: "intermediate", ...input });
}

function submitTextAnswer(cookie, interviewId, input) {
  return request(app)
    .post(`/api/interviews/${interviewId}/answers`)
    .set("Cookie", cookie)
    .send(input);
}

function getInterview(cookie, interviewId) {
  return request(app)
    .get(`/api/interviews/${interviewId}`)
    .set("Cookie", cookie);
}

function completeInterview(cookie, interviewId) {
  return request(app)
    .post(`/api/interviews/${interviewId}/complete`)
    .set("Cookie", cookie);
}

describe("interview session routes", () => {
  it("creates an owned active session with a persisted first question", async () => {
    const { cookie, user } = await signup();

    const response = await startInterview(cookie);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      interview: {
        id: expect.any(String),
        interviewType: "DSA",
        level: "intermediate",
        startedAt: expect.any(String),
        status: "active",
      },
      question: {
        id: expect.any(String),
        order: 1,
        prompt:
          "Explain how a hash map handles collisions and when lookup performance can degrade.",
      },
    });

    const session = await InterviewSession.findById(response.body.interview.id);
    expect(session).toMatchObject({
      status: "active",
      userId: expect.objectContaining({ toString: expect.any(Function) }),
    });
    expect(session.userId.toString()).toBe(user.id);
    expect(session.questions).toHaveLength(1);
  });

  it("validates interview setup and requires a session", async () => {
    const invalidResponse = await request(app)
      .post("/api/interviews")
      .send({ interviewType: "Coding", level: "expert" });
    const { cookie } = await signup();
    const invalidInputResponse = await startInterview(cookie, {
      interviewType: "Coding",
      level: "expert",
    });

    expect(invalidResponse.status).toBe(401);
    expect(invalidInputResponse.status).toBe(400);
    expect(invalidInputResponse.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        fields: {
          interviewType: "Choose DSA, HR, or System Design.",
          level: "Choose beginner, intermediate, or advanced.",
        },
        message: "Check the highlighted fields.",
      },
    });
    await expect(InterviewSession.countDocuments()).resolves.toBe(0);
  });

  it("rejects unavailable resume context before generation or persistence", async () => {
    const { cookie } = await signup();

    const response = await startInterview(cookie, {
      resumeId: "507f1f77bcf86cd799439011",
    });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        code: "RESUME_CONTEXT_UNAVAILABLE",
        message: "Resume context is not available yet. Start without a resume.",
      },
    });
    await expect(InterviewSession.countDocuments()).resolves.toBe(0);
  });

  it("persists next question for an owned active session", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);

    const response = await request(app)
      .post(`/api/interviews/${startResponse.body.interview.id}/questions`)
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      question: {
        id: expect.any(String),
        order: 2,
        prompt:
          "How would you find the first non-repeating character in a string?",
      },
    });
    const session = await InterviewSession.findById(
      startResponse.body.interview.id,
    );
    expect(session.questions.map(({ order }) => order)).toEqual([1, 2]);
  });

  it("persists one validated typed answer on owned active question", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const questionId = startResponse.body.question.id;

    const response = await submitTextAnswer(
      cookie,
      startResponse.body.interview.id,
      { questionId, text: "  A hash map uses buckets for key-value pairs.  " },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      answer: {
        id: expect.any(String),
        inputMode: "text",
        submittedAt: expect.any(String),
        text: "A hash map uses buckets for key-value pairs.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add one concrete example to support your explanation."],
        nextStep: "Practise giving a concise answer with a concrete example.",
        overallScore: 76,
        strengths: ["Explains the core idea clearly."],
      },
    });
    const session = await InterviewSession.findById(
      startResponse.body.interview.id,
    );
    expect(session.questions.id(questionId).answers).toHaveLength(1);
    expect(session.questions.id(questionId).answers[0]).toMatchObject({
      evaluationStatus: "completed",
      inputMode: "text",
      text: "A hash map uses buckets for key-value pairs.",
    });
    expect(session.questions.id(questionId).answers[0].feedback).toMatchObject({
      overallScore: 76,
    });
  });

  it("retrieves and completes an owned evaluated session with saved summary", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;

    await submitTextAnswer(cookie, interviewId, {
      questionId: startResponse.body.question.id,
      text: "A hash map uses buckets for key-value pairs.",
    });

    const activeResponse = await getInterview(cookie, interviewId);
    const completeResponse = await completeInterview(cookie, interviewId);
    const completedResponse = await getInterview(cookie, interviewId);

    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body.interview).toMatchObject({
      id: interviewId,
      status: "active",
      questions: [
        {
          answers: [
            {
              inputMode: "text",
              text: "A hash map uses buckets for key-value pairs.",
              feedback: { overallScore: 76 },
            },
          ],
        },
      ],
    });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.interview).toMatchObject({
      id: interviewId,
      status: "completed",
      completedAt: expect.any(String),
      summary: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add one concrete example to support your explanation."],
        overallScore: 76,
        recommendation:
          "Practise giving a concise answer with a concrete example.",
        strengths: ["Explains the core idea clearly."],
      },
    });
    expect(completedResponse.body.interview).toMatchObject(
      completeResponse.body.interview,
    );
  });

  it("protects session retrieval and completion ownership and state", async () => {
    const { cookie: ownerCookie } = await signup();
    const startResponse = await startInterview(ownerCookie);
    const { cookie: otherCookie } = await signup({
      ...validSignup,
      email: "complete.other.user@example.com",
    });
    const { id: interviewId } = startResponse.body.interview;

    const crossUserRead = await getInterview(otherCookie, interviewId);
    const crossUserComplete = await completeInterview(otherCookie, interviewId);
    const prematureComplete = await completeInterview(ownerCookie, interviewId);

    expect(crossUserRead.status).toBe(404);
    expect(crossUserRead.body.error.code).toBe("INTERVIEW_NOT_FOUND");
    expect(crossUserComplete.status).toBe(404);
    expect(crossUserComplete.body.error.code).toBe("INTERVIEW_NOT_FOUND");
    expect(prematureComplete.status).toBe(409);
    expect(prematureComplete.body.error.code).toBe("INTERVIEW_NOT_READY");

    await submitTextAnswer(ownerCookie, interviewId, {
      questionId: startResponse.body.question.id,
      text: "A valid answer.",
    });
    const firstComplete = await completeInterview(ownerCookie, interviewId);
    const duplicateComplete = await completeInterview(ownerCookie, interviewId);

    expect(firstComplete.status).toBe(200);
    expect(duplicateComplete.status).toBe(409);
    expect(duplicateComplete.body.error.code).toBe("INTERVIEW_NOT_ACTIVE");
  });

  it("rejects invalid, duplicate, missing-question, and cross-user answers", async () => {
    const { cookie: ownerCookie } = await signup();
    const startResponse = await startInterview(ownerCookie);
    const { cookie: otherCookie } = await signup({
      ...validSignup,
      email: "answer.other.user@example.com",
    });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;

    const invalidResponse = await submitTextAnswer(ownerCookie, interviewId, {
      questionId,
      text: "   ",
    });
    const missingQuestionResponse = await submitTextAnswer(
      ownerCookie,
      interviewId,
      { questionId: "507f1f77bcf86cd799439011", text: "A valid answer." },
    );
    const crossUserResponse = await submitTextAnswer(otherCookie, interviewId, {
      questionId,
      text: "A valid answer.",
    });
    const firstAnswerResponse = await submitTextAnswer(
      ownerCookie,
      interviewId,
      {
        questionId,
        text: "A valid answer.",
      },
    );
    const duplicateResponse = await submitTextAnswer(ownerCookie, interviewId, {
      questionId,
      text: "A different answer.",
    });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error).toEqual({
      code: "VALIDATION_ERROR",
      fields: { text: "Enter an answer before saving." },
      message: "Check the highlighted fields.",
    });
    expect(missingQuestionResponse.body.error.code).toBe("QUESTION_NOT_FOUND");
    expect(missingQuestionResponse.status).toBe(404);
    expect(crossUserResponse.body.error.code).toBe("INTERVIEW_NOT_FOUND");
    expect(crossUserResponse.status).toBe(404);
    expect(firstAnswerResponse.status).toBe(200);
    expect(duplicateResponse.body.error.code).toBe("ANSWER_ALREADY_SUBMITTED");
    expect(duplicateResponse.status).toBe(409);
  });

  it("rejects inactive sessions and allows only one simultaneous answer write", async () => {
    const { cookie, user } = await signup();
    const completedSession = await InterviewSession.create({
      completedAt: new Date(),
      interviewType: "HR",
      level: "beginner",
      questions: [
        {
          generatedAt: new Date(),
          order: 1,
          prompt: "Tell me about yourself.",
        },
      ],
      startedAt: new Date(),
      status: "completed",
      summary: {},
      userId: user.id,
    });
    const inactiveResponse = await submitTextAnswer(
      cookie,
      completedSession.id,
      {
        questionId: completedSession.questions[0].id,
        text: "An answer.",
      },
    );
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const responses = await Promise.all([
      submitTextAnswer(cookie, interviewId, {
        questionId,
        text: "First answer.",
      }),
      submitTextAnswer(cookie, interviewId, {
        questionId,
        text: "Second answer.",
      }),
    ]);
    const session = await InterviewSession.findById(interviewId);

    expect(inactiveResponse.body.error.code).toBe("INTERVIEW_NOT_ACTIVE");
    expect(inactiveResponse.status).toBe(409);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(session.questions.id(questionId).answers).toHaveLength(1);
  });

  it("preserves saved answer when evaluation fails", async () => {
    const evaluationFailure = new AppError(
      "AI_QUOTA_EXCEEDED",
      "AI practice is temporarily unavailable. Your saved work is safe; try again later.",
      { expose: true, status: 429 },
    );
    const failingApp = createApp({
      aiProviderService: {
        evaluateAnswer: vi.fn().mockRejectedValue(evaluationFailure),
        generateQuestion: vi.fn().mockResolvedValue({
          prompt: "Explain a hash map.",
        }),
      },
    });
    const signupResponse = await request(failingApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(failingApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({ interviewType: "DSA", level: "intermediate" });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;

    const response = await request(failingApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ questionId, text: "A hash map uses buckets." });
    const session = await InterviewSession.findById(interviewId);
    const answer = session.questions.id(questionId).answers[0];

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("AI_QUOTA_EXCEEDED");
    expect(answer).toMatchObject({
      evaluationStatus: "not_started",
      text: "A hash map uses buckets.",
    });
    expect(answer.feedback).toBeUndefined();
  });

  it("does not expose another user's session", async () => {
    const { cookie: ownerCookie } = await signup();
    const ownerStartResponse = await startInterview(ownerCookie);
    const { cookie: otherCookie } = await signup({
      ...validSignup,
      email: "other.user@example.com",
    });

    const response = await request(app)
      .post(`/api/interviews/${ownerStartResponse.body.interview.id}/questions`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "INTERVIEW_NOT_FOUND", message: "Interview not found." },
    });
  });

  it("rejects completed sessions and question-cap requests", async () => {
    const { cookie, user } = await signup();
    const completedSession = await InterviewSession.create({
      completedAt: new Date(),
      interviewType: "HR",
      level: "beginner",
      questions: [],
      startedAt: new Date(),
      status: "completed",
      summary: {},
      userId: user.id,
    });
    const cappedSession = await InterviewSession.create({
      interviewType: "DSA",
      level: "beginner",
      questions: Array.from(
        { length: maxQuestionsPerInterview },
        (_, index) => ({
          generatedAt: new Date(),
          order: index + 1,
          prompt: `Question ${index + 1}`,
        }),
      ),
      startedAt: new Date(),
      status: "active",
      userId: user.id,
    });

    const completedResponse = await request(app)
      .post(`/api/interviews/${completedSession.id}/questions`)
      .set("Cookie", cookie);
    const cappedResponse = await request(app)
      .post(`/api/interviews/${cappedSession.id}/questions`)
      .set("Cookie", cookie);

    expect(completedResponse.body.error.code).toBe("INTERVIEW_NOT_ACTIVE");
    expect(completedResponse.status).toBe(409);
    expect(cappedResponse.body.error.code).toBe("QUESTION_LIMIT_REACHED");
    expect(cappedResponse.status).toBe(409);
  });

  it("allows only one simultaneous next-question write", async () => {
    let generationCalls = 0;
    let signalGenerationStarted;
    const generationResolvers = [];
    const generationStarted = new Promise((resolve) => {
      signalGenerationStarted = resolve;
    });
    const concurrentApp = createApp({
      aiProviderService: {
        generateQuestion: vi.fn(
          () =>
            new Promise((resolve) => {
              generationCalls += 1;
              if (generationCalls === 2) {
                signalGenerationStarted();
              }
              generationResolvers.push(resolve);
            }),
        ),
      },
    });
    const signupResponse = await request(concurrentApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const session = await InterviewSession.create({
      interviewType: "DSA",
      level: "intermediate",
      questions: [
        {
          generatedAt: new Date(),
          order: 1,
          prompt: "Explain a hash map.",
        },
      ],
      startedAt: new Date(),
      status: "active",
      userId: signupResponse.body.user.id,
    });

    const firstRequest = request(concurrentApp)
      .post(`/api/interviews/${session.id}/questions`)
      .set("Cookie", cookie)
      .then((response) => response);
    const secondRequest = request(concurrentApp)
      .post(`/api/interviews/${session.id}/questions`)
      .set("Cookie", cookie)
      .then((response) => response);

    await generationStarted;
    generationResolvers.forEach((resolve) =>
      resolve({ prompt: "How would you test this queue?" }),
    );
    const responses = await Promise.all([firstRequest, secondRequest]);
    const updatedSession = await InterviewSession.findById(session.id);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(updatedSession.questions).toHaveLength(2);
  });

  it("does not persist a session when provider generation fails", async () => {
    const providerFailure = new Error("Provider unavailable");
    providerFailure.code = "AI_PROVIDER_UNAVAILABLE";
    providerFailure.expose = true;
    providerFailure.status = 502;
    const failingApp = createApp({
      aiProviderService: {
        generateQuestion: vi.fn().mockRejectedValue(providerFailure),
      },
    });
    const signupResponse = await request(failingApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);

    const response = await request(failingApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({ interviewType: "DSA", level: "intermediate" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
    await expect(InterviewSession.countDocuments()).resolves.toBe(0);

    const existingSession = await InterviewSession.create({
      interviewType: "DSA",
      level: "intermediate",
      questions: [
        {
          generatedAt: new Date(),
          order: 1,
          prompt: "Explain a hash map.",
        },
      ],
      startedAt: new Date(),
      status: "active",
      userId: signupResponse.body.user.id,
    });
    const nextQuestionResponse = await request(failingApp)
      .post(`/api/interviews/${existingSession.id}/questions`)
      .set("Cookie", cookie);
    const unchangedSession = await InterviewSession.findById(
      existingSession.id,
    );

    expect(nextQuestionResponse.status).toBe(502);
    expect(unchangedSession.questions).toHaveLength(1);
  });
});

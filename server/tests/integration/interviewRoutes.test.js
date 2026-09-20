import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import InterviewSession, {
  maxQuestionsPerInterview,
} from "../../src/models/InterviewSession.js";
import Resume from "../../src/models/Resume.js";
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
    .send({
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
      ...input,
    });
}

function generateNextQuestion(
  cookie,
  interviewId,
  idempotencyKey = randomUUID(),
) {
  return request(app)
    .post(`/api/interviews/${interviewId}/questions`)
    .set("Cookie", cookie)
    .send({ idempotencyKey });
}

function submitTextAnswer(cookie, interviewId, input) {
  return request(app)
    .post(`/api/interviews/${interviewId}/answers`)
    .set("Cookie", cookie)
    .send({ idempotencyKey: randomUUID(), ...input });
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

function evaluationFeedback(overrides = {}) {
  return {
    accuracyScore: 80,
    clarityScore: 80,
    confidenceScore: 80,
    improvements: ["Add an example."],
    nextStep: "Practise one example.",
    overallScore: 80,
    strengths: ["Clear answer."],
    ...overrides,
  };
}

function completedSessionInput(userId) {
  return {
    completedAt: new Date(),
    interviewType: "HR",
    level: "beginner",
    questions: [
      {
        answers: [
          {
            evaluationStatus: "completed",
            feedback: {
              accuracyScore: 80,
              clarityScore: 80,
              confidenceScore: 80,
              evaluatedAt: new Date(),
              improvements: ["Add an example."],
              nextStep: "Practise one example.",
              overallScore: 80,
              strengths: ["Clear answer."],
            },
            inputMode: "text",
            submittedAt: new Date(),
            text: "A completed answer.",
          },
        ],
        generatedAt: new Date(),
        order: 1,
        prompt: "Tell me about yourself.",
      },
    ],
    startedAt: new Date(),
    status: "completed",
    summary: {
      accuracyScore: 80,
      clarityScore: 80,
      confidenceScore: 80,
      improvements: ["Add an example."],
      overallScore: 80,
      recommendation: "Practise one example.",
      strengths: ["Clear answer."],
    },
    userId,
  };
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

  it("reuses completed start and next-question operations without another provider call", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValueOnce({ prompt: "First idempotent question." })
      .mockResolvedValueOnce({ prompt: "Second idempotent question." });
    const idempotentApp = createApp({
      aiProviderService: { generateQuestion },
    });
    const signupResponse = await request(idempotentApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startKey = randomUUID();
    const startInput = {
      idempotencyKey: startKey,
      interviewType: "DSA",
      level: "intermediate",
    };

    const firstStart = await request(idempotentApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send(startInput);
    const repeatedStart = await request(idempotentApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send(startInput);
    const nextKey = randomUUID();
    const firstNext = await request(idempotentApp)
      .post(`/api/interviews/${firstStart.body.interview.id}/questions`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: nextKey });
    const repeatedNext = await request(idempotentApp)
      .post(`/api/interviews/${firstStart.body.interview.id}/questions`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: nextKey });
    const lateRepeatedStart = await request(idempotentApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send(startInput);

    expect(firstStart.status).toBe(201);
    expect(repeatedStart.body).toEqual(firstStart.body);
    expect(firstNext.status).toBe(200);
    expect(repeatedNext.body).toEqual(firstNext.body);
    expect(lateRepeatedStart.body).toEqual(firstStart.body);
    expect(generateQuestion).toHaveBeenCalledTimes(2);
    await expect(
      InterviewSession.findById(firstStart.body.interview.id),
    ).resolves.toMatchObject({ questions: expect.any(Array) });
    const session = await InterviewSession.findById(
      firstStart.body.interview.id,
    );
    expect(session.questions).toHaveLength(2);
  });

  it("allows only one provider call for simultaneous start requests", async () => {
    let resolveQuestion;
    let signalGenerationStarted;
    const generationStarted = new Promise((resolve) => {
      signalGenerationStarted = resolve;
    });
    const generateQuestion = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveQuestion = resolve;
          signalGenerationStarted();
        }),
    );
    const concurrentApp = createApp({
      aiProviderService: { generateQuestion },
    });
    const signupResponse = await request(concurrentApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const input = {
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
    };
    const firstRequest = request(concurrentApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send(input)
      .then((response) => response);

    await generationStarted;
    const secondResponse = await request(concurrentApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send(input);
    resolveQuestion({ prompt: "One generated question." });
    const firstResponse = await firstRequest;

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(generateQuestion).toHaveBeenCalledTimes(1);
    await expect(InterviewSession.countDocuments()).resolves.toBe(1);
  });

  it("releases a failed start persistence claim and retries safely", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValue({ prompt: "Recoverable generated question." });
    const persistenceApp = createApp({
      aiProviderService: { generateQuestion },
    });
    const signupResponse = await request(persistenceApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const input = {
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
    };
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    let shouldFailWrite = true;
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementation((filter, update, options) => {
        if (
          shouldFailWrite &&
          update?.$push?.questions &&
          update?.$set?.status
        ) {
          shouldFailWrite = false;
          return Promise.reject(new Error("Injected persistence failure"));
        }

        return originalFindOneAndUpdate(filter, update, options);
      });

    try {
      const failedResponse = await request(persistenceApp)
        .post("/api/interviews")
        .set("Cookie", cookie)
        .send(input);
      const retryResponse = await request(persistenceApp)
        .post("/api/interviews")
        .set("Cookie", cookie)
        .send(input);
      const session = await InterviewSession.findOne({
        startRequestId: input.idempotencyKey,
      });

      expect(failedResponse.status).toBe(500);
      expect(failedResponse.body.error).toEqual({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again later.",
      });
      expect(retryResponse.status).toBe(201);
      expect(generateQuestion).toHaveBeenCalledTimes(1);
      expect(session.questionGeneration).toBeUndefined();
      expect(session.questions).toHaveLength(1);
      await expect(InterviewSession.countDocuments()).resolves.toBe(1);
    } finally {
      updateSpy.mockRestore();
    }
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
    const missingKeyResponse = await request(app)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({ interviewType: "DSA", level: "intermediate" });

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
    expect(missingKeyResponse.status).toBe(400);
    expect(missingKeyResponse.body.error.fields).toEqual({
      idempotencyKey: "Request identifier is invalid.",
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
        message:
          "Resume context is unavailable. Choose another resume or continue without one.",
      },
    });
    await expect(InterviewSession.countDocuments()).resolves.toBe(0);
  });

  it("uses short owned resume context and preserves no-resume generation", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValueOnce({ prompt: "Ask about backend experience." })
      .mockResolvedValueOnce({ prompt: "Ask a different backend question." })
      .mockResolvedValueOnce({ prompt: "Ask a context-free question." });
    const contextApp = createApp({
      aiProviderService: { generateQuestion },
    });
    const ownerSignup = await request(contextApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const ownerCookie = getSessionCookie(ownerSignup);
    const otherSignup = await request(contextApp)
      .post("/api/auth/signup")
      .send({ ...validSignup, email: "resume.context.other@example.com" });
    const otherCookie = getSessionCookie(otherSignup);
    const resume = await Resume.create({
      extractedText: `  Backend Engineer\nNode MongoDB  ${"x".repeat(3000)}`,
      extractionStatus: "completed",
      mimeType: "application/pdf",
      originalName: "resume.pdf",
      sizeBytes: 1024,
      storage: { key: "controlled.pdf", provider: "local" },
      userId: ownerSignup.body.user.id,
    });

    const ownerStart = await request(contextApp)
      .post("/api/interviews")
      .set("Cookie", ownerCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        resumeId: resume.id,
      });
    const nextQuestion = await request(contextApp)
      .post(`/api/interviews/${ownerStart.body.interview.id}/questions`)
      .set("Cookie", ownerCookie)
      .send({ idempotencyKey: randomUUID() });
    const foreignStart = await request(contextApp)
      .post("/api/interviews")
      .set("Cookie", otherCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        resumeId: resume.id,
      });
    const noResumeStart = await request(contextApp)
      .post("/api/interviews")
      .set("Cookie", ownerCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "HR",
        level: "beginner",
      });

    expect(ownerStart.status).toBe(201);
    expect(nextQuestion.status).toBe(200);
    expect(foreignStart.status).toBe(422);
    expect(foreignStart.body.error.code).toBe("RESUME_CONTEXT_UNAVAILABLE");
    expect(noResumeStart.status).toBe(201);
    expect(generateQuestion).toHaveBeenCalledTimes(3);
    expect(generateQuestion.mock.calls[0][0]).toMatchObject({
      resumeContext: expect.stringContaining("Backend Engineer Node MongoDB"),
    });
    expect(generateQuestion.mock.calls[0][0].resumeContext.length).toBe(2000);
    expect(generateQuestion.mock.calls[1][0].resumeContext).toBe(
      generateQuestion.mock.calls[0][0].resumeContext,
    );
    expect(generateQuestion.mock.calls[2][0].resumeContext).toBeUndefined();
    await expect(
      InterviewSession.findById(ownerStart.body.interview.id),
    ).resolves.toMatchObject({
      resumeId: expect.objectContaining({ toString: expect.any(Function) }),
    });
  });

  it("persists next question for an owned active session", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);

    const response = await generateNextQuestion(
      cookie,
      startResponse.body.interview.id,
    );

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

  it("recovers a stale question-generation claim", async () => {
    const { cookie, user } = await signup();
    const session = await InterviewSession.create({
      interviewType: "DSA",
      level: "intermediate",
      questionGeneration: {
        claimId: randomUUID(),
        expectedQuestionCount: 1,
        idempotencyKey: randomUUID(),
        startedAt: new Date(Date.now() - 31_000),
      },
      questions: [
        {
          generatedAt: new Date(),
          order: 1,
          prompt: "Explain a stack.",
        },
      ],
      startedAt: new Date(),
      status: "active",
      userId: user.id,
    });

    const response = await generateNextQuestion(cookie, session.id);
    const updatedSession = await InterviewSession.findById(session.id);

    expect(response.status).toBe(200);
    expect(updatedSession.questionGeneration).toBeUndefined();
    expect(updatedSession.questions).toHaveLength(2);
  });

  it("releases a failed next-question persistence claim and retries safely", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValueOnce({ prompt: "First question." })
      .mockResolvedValueOnce({ prompt: "Recovered next question." });
    const persistenceApp = createApp({
      aiProviderService: { generateQuestion },
    });
    const signupResponse = await request(persistenceApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(persistenceApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const idempotencyKey = randomUUID();
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    let shouldFailWrite = true;
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementation((filter, update, options) => {
        if (
          shouldFailWrite &&
          update?.$push?.questions &&
          !update?.$set?.status
        ) {
          shouldFailWrite = false;
          return Promise.reject(new Error("Injected persistence failure"));
        }

        return originalFindOneAndUpdate(filter, update, options);
      });

    try {
      const failedResponse = await request(persistenceApp)
        .post(`/api/interviews/${startResponse.body.interview.id}/questions`)
        .set("Cookie", cookie)
        .send({ idempotencyKey });
      const retryResponse = await request(persistenceApp)
        .post(`/api/interviews/${startResponse.body.interview.id}/questions`)
        .set("Cookie", cookie)
        .send({ idempotencyKey });
      const session = await InterviewSession.findById(
        startResponse.body.interview.id,
      );

      expect(failedResponse.status).toBe(500);
      expect(failedResponse.body.error).toEqual({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again later.",
      });
      expect(retryResponse.status).toBe(200);
      expect(generateQuestion).toHaveBeenCalledTimes(2);
      expect(session.questionGeneration).toBeUndefined();
      expect(session.questions).toHaveLength(2);
    } finally {
      updateSpy.mockRestore();
    }
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
    expect(completedResponse.body.interview.questions[0]).toMatchObject({
      id: startResponse.body.question.id,
      order: 1,
      prompt: startResponse.body.question.prompt,
      answers: [
        {
          id: expect.any(String),
          inputMode: "text",
          submittedAt: expect.any(String),
          text: "A hash map uses buckets for key-value pairs.",
          feedback: {
            accuracyScore: 78,
            clarityScore: 76,
            confidenceScore: 74,
            improvements: [
              "Add one concrete example to support your explanation.",
            ],
            nextStep:
              "Practise giving a concise answer with a concrete example.",
            overallScore: 76,
            strengths: ["Explains the core idea clearly."],
          },
        },
      ],
    });
    expect(JSON.stringify(completedResponse.body)).not.toMatch(
      /evaluation(Key|Claim|Output|Status|Started)|generationKey|questionGeneration/,
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

  it("rejects pending evaluation and question generation during completion", async () => {
    const { cookie, user } = await signup();
    const startedAt = new Date();
    const pendingSession = await InterviewSession.create({
      interviewType: "DSA",
      level: "intermediate",
      questions: [
        {
          answers: [
            {
              evaluationClaimId: randomUUID(),
              evaluationKey: randomUUID(),
              evaluationStartedAt: startedAt,
              evaluationStatus: "pending",
              inputMode: "text",
              submittedAt: startedAt,
              text: "Pending answer.",
            },
          ],
          generatedAt: startedAt,
          order: 1,
          prompt: "Explain a hash map.",
        },
      ],
      startedAt,
      status: "active",
      userId: user.id,
    });
    const generationSession = await InterviewSession.create({
      interviewType: "DSA",
      level: "intermediate",
      questionGeneration: {
        claimId: randomUUID(),
        expectedQuestionCount: 1,
        idempotencyKey: randomUUID(),
        startedAt,
      },
      questions: [
        {
          answers: [
            {
              evaluationStatus: "completed",
              feedback: { ...evaluationFeedback(), evaluatedAt: startedAt },
              inputMode: "text",
              submittedAt: startedAt,
              text: "Evaluated answer.",
            },
          ],
          generatedAt: startedAt,
          order: 1,
          prompt: "Explain a hash map.",
        },
      ],
      startedAt,
      status: "active",
      userId: user.id,
    });

    const pendingResponse = await completeInterview(cookie, pendingSession.id);
    const generationResponse = await completeInterview(
      cookie,
      generationSession.id,
    );

    expect(pendingResponse.status).toBe(409);
    expect(pendingResponse.body.error.code).toBe("EVALUATION_IN_PROGRESS");
    expect(generationResponse.status).toBe(409);
    expect(generationResponse.body.error.code).toBe(
      "QUESTION_GENERATION_IN_PROGRESS",
    );
  });

  it("allows only one simultaneous completion", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;
    await submitTextAnswer(cookie, interviewId, {
      questionId: startResponse.body.question.id,
      text: "Use buckets.",
    });

    const responses = await Promise.all([
      completeInterview(cookie, interviewId),
      completeInterview(cookie, interviewId),
    ]);
    const session = await InterviewSession.findById(interviewId);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(
      responses.find(({ status }) => status === 409).body.error.code,
    ).toMatch(/INTERVIEW_(COMPLETION_CONFLICT|NOT_ACTIVE)/);
    expect(session.status).toBe("completed");
    expect(session.summary).toMatchObject({ overallScore: 76 });
  });

  it("keeps active state after completion persistence failure and retries", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;
    await submitTextAnswer(cookie, interviewId, {
      questionId: startResponse.body.question.id,
      text: "Use buckets.",
    });
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    let failCompletion = true;
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementation((filter, update, options) => {
        if (update?.$set?.status === "completed" && failCompletion) {
          failCompletion = false;
          return Promise.reject(
            new Error("Injected completion persistence failure"),
          );
        }
        return originalFindOneAndUpdate(filter, update, options);
      });

    try {
      const failedResponse = await completeInterview(cookie, interviewId);
      const afterFailure = await InterviewSession.findById(interviewId);
      const retryResponse = await completeInterview(cookie, interviewId);
      const afterRetry = await InterviewSession.findById(interviewId);

      expect(failedResponse.status).toBe(500);
      expect(failedResponse.body.error).toEqual({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again later.",
      });
      expect(afterFailure.status).toBe("active");
      expect(afterFailure.completedAt).toBeUndefined();
      expect(afterFailure.summary).toBeUndefined();
      expect(retryResponse.status).toBe(200);
      expect(afterRetry.status).toBe("completed");
      expect(afterRetry.summary).toMatchObject({ overallScore: 76 });
    } finally {
      updateSpy.mockRestore();
    }
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
    const completedSession = await InterviewSession.create(
      completedSessionInput(user.id),
    );
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
    const evaluateAnswer = vi
      .fn()
      .mockRejectedValueOnce(evaluationFailure)
      .mockResolvedValueOnce({
        accuracyScore: 80,
        clarityScore: 80,
        confidenceScore: 80,
        improvements: ["Add an example."],
        nextStep: "Practise one example.",
        overallScore: 80,
        strengths: ["Clear answer."],
      });
    const failingApp = createApp({
      aiProviderService: {
        evaluateAnswer,
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
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();

    const response = await request(failingApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ idempotencyKey, questionId, text: "A hash map uses buckets." });
    const session = await InterviewSession.findById(interviewId);
    const answer = session.questions.id(questionId).answers[0];

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("AI_QUOTA_EXCEEDED");
    expect(answer).toMatchObject({
      evaluationStatus: "not_started",
      text: "A hash map uses buckets.",
    });
    expect(answer.feedback).toBeUndefined();

    const retryResponse = await request(failingApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({
        idempotencyKey,
        questionId,
        text: "A changed answer must not replace the saved one.",
      });
    const retriedSession = await InterviewSession.findById(interviewId);

    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.answer.text).toBe("A hash map uses buckets.");
    expect(retriedSession.questions.id(questionId).answers[0]).toMatchObject({
      evaluationStatus: "completed",
      text: "A hash map uses buckets.",
    });
    expect(evaluateAnswer).toHaveBeenCalledTimes(2);
  });

  it("requires an answer operation key and rejects oversized text before persistence", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;

    const missingKey = await request(app)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ questionId, text: "A valid answer." });
    const oversized = await submitTextAnswer(cookie, interviewId, {
      questionId,
      text: "a".repeat(10_001),
    });
    const session = await InterviewSession.findById(interviewId);

    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error.fields.idempotencyKey).toBe(
      "Request identifier is invalid.",
    );
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.fields.text).toBe(
      "Answer must be at most 10000 characters.",
    );
    expect(session.questions.id(questionId).answers).toHaveLength(0);
  });

  it("returns safely from answer-save failure and succeeds on explicit retry", async () => {
    const { cookie } = await signup();
    const startResponse = await startInterview(cookie);
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    let failAnswerWrite = true;
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementation((filter, update, options) => {
        const isAnswerWrite = Boolean(update?.$push?.["questions.$.answers"]);
        if (isAnswerWrite && failAnswerWrite) {
          failAnswerWrite = false;
          return Promise.reject(
            new Error("Injected answer persistence failure"),
          );
        }
        return originalFindOneAndUpdate(filter, update, options);
      });

    try {
      const input = { idempotencyKey, questionId, text: "Use buckets." };
      const failedResponse = await submitTextAnswer(cookie, interviewId, input);
      const afterFailure = await InterviewSession.findById(interviewId);
      const retryResponse = await submitTextAnswer(cookie, interviewId, input);
      const afterRetry = await InterviewSession.findById(interviewId);

      expect(failedResponse.status).toBe(500);
      expect(failedResponse.body.error).toEqual({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again later.",
      });
      expect(afterFailure.questions.id(questionId).answers).toHaveLength(0);
      expect(retryResponse.status).toBe(200);
      expect(afterRetry.questions.id(questionId).answers).toHaveLength(1);
      expect(afterRetry.questions.id(questionId).answers[0]).toMatchObject({
        evaluationStatus: "completed",
        text: "Use buckets.",
      });
    } finally {
      updateSpy.mockRestore();
    }
  });

  it("deduplicates simultaneous evaluation and replays its completed operation", async () => {
    let resolveEvaluation;
    const evaluateAnswer = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveEvaluation = resolve;
        }),
    );
    const evaluationApp = createApp({
      aiProviderService: {
        evaluateAnswer,
        generateQuestion: vi.fn().mockResolvedValue({
          prompt: "Explain a hash map.",
        }),
      },
    });
    const signupResponse = await request(evaluationApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(evaluationApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();
    const input = { idempotencyKey, questionId, text: "Use buckets." };

    const firstRequest = request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send(input)
      .then((response) => response);
    await vi.waitFor(() => expect(evaluateAnswer).toHaveBeenCalledTimes(1));
    const competingResponse = await request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send(input);
    resolveEvaluation(evaluationFeedback());
    const firstResponse = await firstRequest;
    const replayResponse = await request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ ...input, text: "Changed text must not replace saved text." });
    const session = await InterviewSession.findById(interviewId);

    expect(competingResponse.status).toBe(409);
    expect(competingResponse.body.error.code).toBe("EVALUATION_IN_PROGRESS");
    expect(firstResponse.status).toBe(200);
    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body).toEqual(firstResponse.body);
    expect(evaluateAnswer).toHaveBeenCalledTimes(1);
    expect(session.questions.id(questionId).answers).toHaveLength(1);
    expect(session.questions.id(questionId).answers[0]).toMatchObject({
      evaluationKey: idempotencyKey,
      evaluationStatus: "completed",
      text: "Use buckets.",
    });
  });

  it("reuses staged feedback after final persistence failure", async () => {
    const evaluateAnswer = vi.fn().mockResolvedValue(evaluationFeedback());
    const evaluationApp = createApp({
      aiProviderService: {
        evaluateAnswer,
        generateQuestion: vi.fn().mockResolvedValue({
          prompt: "Explain a hash map.",
        }),
      },
    });
    const signupResponse = await request(evaluationApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(evaluationApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    let failFinalWrite = true;
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementation((filter, update, options) => {
        const isFinalWrite =
          update?.$set?.[
            "questions.$[question].answers.$[answer].evaluationStatus"
          ] === "completed";
        if (isFinalWrite && failFinalWrite) {
          failFinalWrite = false;
          return Promise.reject(
            new Error("Injected feedback persistence failure"),
          );
        }
        return originalFindOneAndUpdate(filter, update, options);
      });

    try {
      const failedResponse = await request(evaluationApp)
        .post(`/api/interviews/${interviewId}/answers`)
        .set("Cookie", cookie)
        .send({ idempotencyKey, questionId, text: "Use buckets." });
      const afterFailure = await InterviewSession.findById(interviewId);
      const failureRead = await request(evaluationApp)
        .get(`/api/interviews/${interviewId}`)
        .set("Cookie", cookie);
      const retryResponse = await request(evaluationApp)
        .post(`/api/interviews/${interviewId}/answers`)
        .set("Cookie", cookie)
        .send({
          idempotencyKey,
          questionId,
          text: "Changed text must not replace saved text.",
        });
      const afterRetry = await InterviewSession.findById(interviewId);

      expect(failedResponse.status).toBe(500);
      expect(failedResponse.body.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(afterFailure.questions.id(questionId).answers[0]).toMatchObject({
        evaluationStatus: "not_started",
        text: "Use buckets.",
      });
      expect(
        afterFailure.questions.id(questionId).answers[0].feedback,
      ).toBeUndefined();
      expect(
        afterFailure.questions.id(questionId).answers[0].evaluationOutput,
      ).toMatchObject({ overallScore: 80 });
      expect(failureRead.status).toBe(200);
      expect(JSON.stringify(failureRead.body)).not.toContain(
        "evaluationOutput",
      );
      expect(JSON.stringify(failureRead.body)).not.toContain("evaluationClaim");
      expect(JSON.stringify(failureRead.body)).not.toContain(idempotencyKey);
      expect(retryResponse.status).toBe(200);
      expect(retryResponse.body.answer.text).toBe("Use buckets.");
      expect(afterRetry.questions.id(questionId).answers[0]).toMatchObject({
        evaluationStatus: "completed",
      });
      expect(
        afterRetry.questions.id(questionId).answers[0].evaluationOutput,
      ).toBeUndefined();
      expect(evaluateAnswer).toHaveBeenCalledTimes(1);
    } finally {
      updateSpy.mockRestore();
    }
  });

  it("recovers stale evaluation after claim release failure", async () => {
    const providerFailure = new AppError(
      "AI_PROVIDER_ERROR",
      "AI practice is temporarily unavailable. Please try again.",
      { expose: true, status: 502 },
    );
    const evaluateAnswer = vi
      .fn()
      .mockRejectedValueOnce(providerFailure)
      .mockResolvedValueOnce(evaluationFeedback());
    const evaluationApp = createApp({
      aiProviderService: {
        evaluateAnswer,
        generateQuestion: vi.fn().mockResolvedValue({
          prompt: "Explain a hash map.",
        }),
      },
    });
    const signupResponse = await request(evaluationApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(evaluationApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();
    const originalUpdateOne = InterviewSession.updateOne.bind(InterviewSession);
    const releaseSpy = vi
      .spyOn(InterviewSession, "updateOne")
      .mockRejectedValueOnce(new Error("Injected claim release failure"));

    const failedResponse = await request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ idempotencyKey, questionId, text: "Use buckets." });
    releaseSpy.mockRestore();
    await originalUpdateOne(
      { _id: interviewId },
      {
        $set: {
          "questions.$[question].answers.$[answer].evaluationStartedAt":
            new Date(Date.now() - 31_000),
        },
      },
      {
        arrayFilters: [
          { "question._id": questionId },
          { "answer.evaluationKey": idempotencyKey },
        ],
      },
    );
    const retryResponse = await request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send({ idempotencyKey, questionId, text: "Changed text." });
    const session = await InterviewSession.findById(interviewId);

    expect(failedResponse.status).toBe(502);
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.answer.text).toBe("Use buckets.");
    expect(session.questions.id(questionId).answers[0]).toMatchObject({
      evaluationStatus: "completed",
      text: "Use buckets.",
    });
    expect(evaluateAnswer).toHaveBeenCalledTimes(2);
  });

  it("prevents a stale claimant from releasing a newer completed evaluation", async () => {
    let rejectStaleEvaluation;
    const evaluateAnswer = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectStaleEvaluation = reject;
          }),
      )
      .mockResolvedValueOnce(
        evaluationFeedback({ overallScore: 91, strengths: ["Recovered."] }),
      );
    const evaluationApp = createApp({
      aiProviderService: {
        evaluateAnswer,
        generateQuestion: vi.fn().mockResolvedValue({
          prompt: "Explain a hash map.",
        }),
      },
    });
    const signupResponse = await request(evaluationApp)
      .post("/api/auth/signup")
      .send(validSignup);
    const cookie = getSessionCookie(signupResponse);
    const startResponse = await request(evaluationApp)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const { id: interviewId } = startResponse.body.interview;
    const { id: questionId } = startResponse.body.question;
    const idempotencyKey = randomUUID();
    const input = { idempotencyKey, questionId, text: "Use buckets." };

    const staleRequest = request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send(input)
      .then((response) => response);
    await vi.waitFor(() => expect(evaluateAnswer).toHaveBeenCalledTimes(1));
    await InterviewSession.updateOne(
      { _id: interviewId },
      {
        $set: {
          "questions.$[question].answers.$[answer].evaluationStartedAt":
            new Date(Date.now() - 31_000),
        },
      },
      {
        arrayFilters: [
          { "question._id": questionId },
          { "answer.evaluationKey": idempotencyKey },
        ],
      },
    );
    const recoveredResponse = await request(evaluationApp)
      .post(`/api/interviews/${interviewId}/answers`)
      .set("Cookie", cookie)
      .send(input);
    rejectStaleEvaluation(
      new AppError(
        "AI_PROVIDER_ERROR",
        "AI practice is temporarily unavailable. Please try again.",
        { expose: true, status: 502 },
      ),
    );
    const staleResponse = await staleRequest;
    const session = await InterviewSession.findById(interviewId);
    const answer = session.questions.id(questionId).answers[0];

    expect(recoveredResponse.status).toBe(200);
    expect(recoveredResponse.body.feedback.overallScore).toBe(91);
    expect(staleResponse.status).toBe(502);
    expect(answer).toMatchObject({
      evaluationStatus: "completed",
      feedback: { overallScore: 91 },
    });
    expect(answer.evaluationClaimId).toBeUndefined();
    expect(answer.evaluationStartedAt).toBeUndefined();
    expect(evaluateAnswer).toHaveBeenCalledTimes(2);
  });

  it("does not expose another user's session", async () => {
    const { cookie: ownerCookie } = await signup();
    const ownerStartResponse = await startInterview(ownerCookie);
    const { cookie: otherCookie } = await signup({
      ...validSignup,
      email: "other.user@example.com",
    });

    const response = await generateNextQuestion(
      otherCookie,
      ownerStartResponse.body.interview.id,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "INTERVIEW_NOT_FOUND", message: "Interview not found." },
    });
  });

  it("rejects completed sessions and question-cap requests", async () => {
    const { cookie, user } = await signup();
    const completedSession = await InterviewSession.create(
      completedSessionInput(user.id),
    );
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

    const completedResponse = await generateNextQuestion(
      cookie,
      completedSession.id,
    );
    const cappedResponse = await generateNextQuestion(cookie, cappedSession.id);

    expect(completedResponse.body.error.code).toBe("INTERVIEW_NOT_ACTIVE");
    expect(completedResponse.status).toBe(409);
    expect(cappedResponse.body.error.code).toBe("QUESTION_LIMIT_REACHED");
    expect(cappedResponse.status).toBe(409);
  });

  it("allows only one provider call and write for simultaneous next-question requests", async () => {
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
              if (generationCalls === 1) {
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
      .send({ idempotencyKey: randomUUID() })
      .then((response) => response);
    const secondRequest = request(concurrentApp)
      .post(`/api/interviews/${session.id}/questions`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: randomUUID() })
      .then((response) => response);

    await generationStarted;
    generationResolvers.forEach((resolve) =>
      resolve({ prompt: "How would you test this queue?" }),
    );
    const responses = await Promise.all([firstRequest, secondRequest]);
    const updatedSession = await InterviewSession.findById(session.id);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(generationCalls).toBe(1);
    expect(updatedSession.questions).toHaveLength(2);
  });

  it("keeps question generation recoverable when provider generation fails", async () => {
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
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
    await expect(
      InterviewSession.findOne({ userId: signupResponse.body.user.id }),
    ).resolves.toMatchObject({ questions: [], status: "created" });

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
      .set("Cookie", cookie)
      .send({ idempotencyKey: randomUUID() });
    const unchangedSession = await InterviewSession.findById(
      existingSession.id,
    );

    expect(nextQuestionResponse.status).toBe(502);
    expect(unchangedSession.questions).toHaveLength(1);
  });
});

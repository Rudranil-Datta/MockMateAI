import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import mongoose from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createApp } from "../../src/app.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import { createTranscriptionService } from "../../src/services/transcriptionService.js";
import { AppError } from "../../src/utils/AppError.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const validMp4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftypM4A "),
  Buffer.from("voice-data"),
]);
const transcribe = vi.fn();
let audioUploadDir;
let app;

useMongoTestDatabase();

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

async function signup(email = "voice@example.com", targetApp = app) {
  const response = await request(targetApp).post("/api/auth/signup").send({
    email,
    name: "Voice Tester",
    password: "secure-password-123",
  });

  return { cookie: getSessionCookie(response), user: response.body.user };
}

async function startInterview(cookie, targetApp = app) {
  const response = await request(targetApp)
    .post("/api/interviews")
    .set("Cookie", cookie)
    .send({
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
    });

  return response.body;
}

function uploadVoice(cookie, interviewId, questionId, options = {}) {
  const pendingRequest = request(options.app || app)
    .post(`/api/interviews/${interviewId}/voice-answers`)
    .field("questionId", questionId)
    .field("idempotencyKey", options.idempotencyKey || randomUUID());

  if (cookie) {
    pendingRequest.set("Cookie", cookie);
  }

  return pendingRequest.attach("audio", options.audio || validMp4, {
    contentType: options.contentType || "audio/mp4",
    filename: options.filename || "answer.mp4",
  });
}

beforeAll(async () => {
  audioUploadDir = await mkdtemp(join(tmpdir(), "mockmateai-audio-test-"));
  app = createApp({
    audioUploadDir,
    transcriptionService: { transcribe },
  });
});

beforeEach(() => {
  transcribe.mockReset();
  transcribe.mockResolvedValue({ text: "Use a stack for LIFO access." });
});

afterEach(async () => {
  const files = await readdir(audioUploadDir);
  await Promise.all(files.map((file) => rm(join(audioUploadDir, file))));
});

afterAll(async () => {
  if (audioUploadDir) {
    await rm(audioUploadDir, { force: true, recursive: true });
  }
});

describe("POST /api/interviews/:id/voice-answers", () => {
  it("transcribes and evaluates MP4 once, persists voice feedback, replays, and blocks replacement", async () => {
    const { cookie } = await signup();
    const started = await startInterview(cookie);
    const key = randomUUID();

    const first = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );
    const replay = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );
    const conflictingVoice = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
    );

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      answer: {
        inputMode: "voice",
        text: "Use a stack for LIFO access.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        overallScore: 76,
      },
    });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(conflictingVoice.status).toBe(409);
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledWith({
      audio: validMp4,
      mimeType: "audio/mp4",
    });

    const saved = await InterviewSession.findById(started.interview.id);
    const savedQuestion = saved.questions.id(started.question.id);
    expect(savedQuestion.voiceTranscription).toBeUndefined();
    expect(savedQuestion.answers).toHaveLength(1);
    expect(savedQuestion.answers[0]).toMatchObject({
      evaluationKey: key,
      evaluationStatus: "completed",
      inputMode: "voice",
      text: "Use a stack for LIFO access.",
    });
    expect(savedQuestion.answers[0].voiceStorageKey).toBeUndefined();

    const publicSession = await request(app)
      .get(`/api/interviews/${started.interview.id}`)
      .set("Cookie", cookie);
    expect(publicSession.body.interview.questions[0]).not.toHaveProperty(
      "voiceTranscription",
    );
    expect(publicSession.body.interview.questions[0].answers[0]).toMatchObject({
      inputMode: "voice",
      text: "Use a stack for LIFO access.",
      feedback: { overallScore: 76 },
    });

    const typed = await request(app)
      .post(`/api/interviews/${started.interview.id}/answers`)
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.question.id,
        text: "Typed replacement.",
      });
    expect(typed.status).toBe(409);

    const completed = await request(app)
      .post(`/api/interviews/${started.interview.id}/complete`)
      .set("Cookie", cookie);
    expect(completed.status).toBe(200);
    expect(completed.body.interview).toMatchObject({
      status: "completed",
      summary: { overallScore: 76 },
    });
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("retries evaluation with the saved voice answer without retranscription", async () => {
    const evaluateAnswer = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError(
          "AI_PROVIDER_UNAVAILABLE",
          "Feedback is temporarily unavailable.",
          { expose: true, status: 502 },
        ),
      )
      .mockResolvedValueOnce({
        accuracyScore: 80,
        clarityScore: 81,
        confidenceScore: 79,
        improvements: ["Add an example."],
        nextStep: "Practise once more.",
        overallScore: 80,
        strengths: ["Clear structure."],
      });
    const recoveryApp = createApp({
      aiProviderService: {
        evaluateAnswer,
        generateQuestion: vi
          .fn()
          .mockResolvedValue({ prompt: "Explain LIFO." }),
      },
      audioUploadDir,
      transcriptionService: { transcribe },
    });
    const { cookie } = await signup("evaluation@example.com", recoveryApp);
    const started = await startInterview(cookie, recoveryApp);
    const key = randomUUID();

    const failed = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { app: recoveryApp, idempotencyKey: key },
    );
    const retried = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { app: recoveryApp, idempotencyKey: key },
    );

    expect(failed.status).toBe(502);
    expect(retried.status).toBe(200);
    expect(retried.body).toMatchObject({
      answer: { inputMode: "voice", text: "Use a stack for LIFO access." },
      feedback: { overallScore: 80 },
    });
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(evaluateAnswer).toHaveBeenCalledTimes(2);

    const saved = await InterviewSession.findById(started.interview.id);
    expect(saved.questions.id(started.question.id).answers).toHaveLength(1);
    expect(
      saved.questions.id(started.question.id).voiceTranscription,
    ).toBeUndefined();
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("rejects unauthenticated, foreign, wrong-question, and inactive work before provider use", async () => {
    const owner = await signup("owner@example.com");
    const started = await startInterview(owner.cookie);
    const foreign = await signup("foreign@example.com");

    const unauthenticated = await uploadVoice(
      undefined,
      started.interview.id,
      started.question.id,
    );
    const forbidden = await uploadVoice(
      foreign.cookie,
      started.interview.id,
      started.question.id,
    );
    const wrongQuestion = await uploadVoice(
      owner.cookie,
      started.interview.id,
      new mongoose.Types.ObjectId().toString(),
    );
    await InterviewSession.updateOne(
      { _id: started.interview.id },
      { $set: { status: "completed" } },
    );
    const inactive = await uploadVoice(
      owner.cookie,
      started.interview.id,
      started.question.id,
    );

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(404);
    expect(wrongQuestion.status).toBe(404);
    expect(inactive.status).toBe(409);
    expect(transcribe).not.toHaveBeenCalled();
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("rejects a malformed interview ID before upload or provider work", async () => {
    const { cookie } = await signup("malformed-id@example.com");

    const response = await uploadVoice(
      cookie,
      "not-an-object-id",
      "507f1f77bcf86cd799439011",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("CastError");
    expect(transcribe).not.toHaveBeenCalled();
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("rejects unusable transcription output, cleans up, and recovers with the same key", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({ text: "" })
      .mockResolvedValueOnce({ text: "Recovered transcript." });
    const recoveryApp = createApp({
      audioUploadDir,
      transcriptionService: createTranscriptionService({
        aiProvider: "gemini",
        generateContent,
      }),
    });
    const { cookie } = await signup(
      "unusable-transcript@example.com",
      recoveryApp,
    );
    const started = await startInterview(cookie, recoveryApp);
    const key = randomUUID();

    const malformed = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { app: recoveryApp, idempotencyKey: key },
    );
    const afterMalformed = await InterviewSession.findById(
      started.interview.id,
    );
    const recovered = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { app: recoveryApp, idempotencyKey: key },
    );

    expect(malformed.status).toBe(422);
    expect(malformed.body.error.code).toBe("UNUSABLE_TRANSCRIPTION");
    expect(
      afterMalformed.questions.id(started.question.id).answers,
    ).toHaveLength(0);
    expect(
      afterMalformed.questions.id(started.question.id).voiceTranscription,
    ).toBeUndefined();
    expect(recovered.status).toBe(200);
    expect(recovered.body.answer.text).toBe("Recovered transcript.");
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("rejects invalid signatures and bounded oversize input without provider work", async () => {
    const { cookie } = await signup();
    const started = await startInterview(cookie);
    const invalid = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { audio: Buffer.from("not-an-mp4") },
    );
    const mismatchedExtension = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { filename: "answer.txt" },
    );
    const missingAudio = await request(app)
      .post(`/api/interviews/${started.interview.id}/voice-answers`)
      .set("Cookie", cookie)
      .field("questionId", started.question.id)
      .field("idempotencyKey", randomUUID());

    const boundedApp = createApp({
      audioUploadDir,
      maxAudioSizeBytes: 8,
      transcriptionService: { transcribe },
    });
    const oversized = await request(boundedApp)
      .post(`/api/interviews/${started.interview.id}/voice-answers`)
      .set("Cookie", cookie)
      .field("questionId", started.question.id)
      .field("idempotencyKey", randomUUID())
      .attach("audio", validMp4, {
        contentType: "audio/mp4",
        filename: "answer.mp4",
      });

    expect(invalid.status).toBe(415);
    expect(mismatchedExtension.status).toBe(415);
    expect(missingAudio.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(transcribe).not.toHaveBeenCalled();
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("allows retry after provider failure and removes the temporary upload", async () => {
    const { cookie } = await signup();
    const started = await startInterview(cookie);
    const key = randomUUID();
    transcribe
      .mockRejectedValueOnce(
        new AppError(
          "TRANSCRIPTION_UNAVAILABLE",
          "Voice transcription is temporarily unavailable.",
          { expose: true, status: 502 },
        ),
      )
      .mockResolvedValueOnce({ text: "Recovered transcript." });

    const failed = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );
    const retried = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );

    expect(failed.status).toBe(502);
    expect(retried.status).toBe(200);
    expect(retried.body.answer).toMatchObject({
      inputMode: "voice",
      text: "Recovered transcript.",
    });
    expect(transcribe).toHaveBeenCalledTimes(2);
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("prevents concurrent duplicate provider calls", async () => {
    const { cookie } = await signup();
    const started = await startInterview(cookie);
    const key = randomUUID();
    let resolveTranscription;
    transcribe.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTranscription = resolve;
      }),
    );

    const firstPromise = uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    ).then((response) => response);
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledTimes(1));
    const duplicate = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );
    resolveTranscription({ text: "Concurrent transcript." });
    const first = await firstPromise;

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(409);
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(await readdir(audioUploadDir)).toEqual([]);
  });

  it("releases an unstaged claim after persistence failure so retry can recover", async () => {
    const { cookie } = await signup();
    const started = await startInterview(cookie);
    const key = randomUUID();
    const originalFindOneAndUpdate =
      InterviewSession.findOneAndUpdate.bind(InterviewSession);
    const updateSpy = vi
      .spyOn(InterviewSession, "findOneAndUpdate")
      .mockImplementationOnce((...arguments_) =>
        originalFindOneAndUpdate(...arguments_),
      )
      .mockRejectedValueOnce(new Error("database detail"));

    const failed = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );
    updateSpy.mockRestore();
    const retried = await uploadVoice(
      cookie,
      started.interview.id,
      started.question.id,
      { idempotencyKey: key },
    );

    expect(failed.status).toBe(500);
    expect(failed.body.error.message).not.toContain("database detail");
    expect(retried.status).toBe(200);
    expect(transcribe).toHaveBeenCalledTimes(2);
    expect(await readdir(audioUploadDir)).toEqual([]);
  });
});

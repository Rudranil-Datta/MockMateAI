import { useRef, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Loader2,
  MessageCircle,
  Network,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  completeInterview,
  generateNextQuestion,
  startInterview,
  submitTextAnswer,
} from "../api/interviewApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

const interviewTypes = [
  {
    description: "Algorithms and data structures",
    icon: Code2,
    title: "DSA",
    value: "DSA",
  },
  {
    description: "Behavioural interview practice",
    icon: MessageCircle,
    title: "HR",
    value: "HR",
  },
  {
    description: "Architecture and trade-offs",
    icon: Network,
    title: "System Design",
    value: "System Design",
  },
];

const levels = [
  {
    description: "Start with fundamentals and clear structure.",
    label: "Beginner",
    value: "beginner",
  },
  {
    description: "Practise realistic mid-level interview depth.",
    label: "Intermediate",
    value: "intermediate",
  },
  {
    description: "Handle trade-offs, edge cases, and senior follow-ups.",
    label: "Advanced",
    value: "advanced",
  },
];

const maxQuestionsPerInterview = 5;
const maxQuestionPromptLength = 2000;
const maxTextAnswerLength = 10000;
const maxFeedbackItemLength = 500;
const maxFeedbackItems = 3;
const maxNextStepLength = 1000;

const feedbackDimensions = [
  { key: "accuracyScore", label: "Accuracy" },
  { key: "clarityScore", label: "Clarity" },
  { key: "confidenceScore", label: "Confidence" },
];

function getScoreLabel(score) {
  if (score >= 85) {
    return "Strong";
  }

  if (score >= 70) {
    return "Solid";
  }

  return "Developing";
}

function createIdempotencyKey() {
  if (typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(
    12,
    16,
  )}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function isGeneratedQuestionResult(question, expectedOrder) {
  return Boolean(
    question?.id &&
    Number.isInteger(question.order) &&
    question.order === expectedOrder &&
    question.order >= 1 &&
    question.order <= maxQuestionsPerInterview &&
    typeof question.prompt === "string" &&
    question.prompt.trim() &&
    question.prompt.length <= maxQuestionPromptLength,
  );
}

function isInterviewStartResult(result, expectedType, expectedLevel) {
  return Boolean(
    result?.interview?.id &&
    result.interview.interviewType === expectedType &&
    result.interview.level === expectedLevel &&
    result.interview.status === "active" &&
    typeof result.interview.startedAt === "string" &&
    !Number.isNaN(Date.parse(result.interview.startedAt)) &&
    isGeneratedQuestionResult(result.question, 1),
  );
}

function isSavedAnswerResult(result) {
  const isScore = (value) =>
    Number.isInteger(value) && value >= 0 && value <= 100;
  const isFeedbackList = (value) =>
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= maxFeedbackItems &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length >= 1 &&
        item.length <= maxFeedbackItemLength,
    );

  return Boolean(
    result?.answer?.id &&
    result.answer.inputMode === "text" &&
    typeof result.answer.text === "string" &&
    result.answer.text.trim() &&
    result.answer.text.length <= maxTextAnswerLength &&
    typeof result.answer.submittedAt === "string" &&
    !Number.isNaN(Date.parse(result.answer.submittedAt)) &&
    isScore(result.feedback?.overallScore) &&
    isScore(result.feedback?.accuracyScore) &&
    isScore(result.feedback?.clarityScore) &&
    isScore(result.feedback?.confidenceScore) &&
    isFeedbackList(result.feedback?.strengths) &&
    isFeedbackList(result.feedback?.improvements) &&
    typeof result.feedback?.nextStep === "string" &&
    result.feedback.nextStep.trim() &&
    result.feedback.nextStep.length <= maxNextStepLength,
  );
}

function isCompletedInterviewResult(result) {
  return Boolean(
    result?.interview?.id &&
    result.interview.status === "completed" &&
    typeof result.interview.completedAt === "string" &&
    Number.isInteger(result.interview.summary?.overallScore),
  );
}

function PracticePage() {
  const navigate = useNavigate();
  const answerIdempotencyKey = useRef(createIdempotencyKey());
  const nextQuestionIdempotencyKey = useRef(createIdempotencyKey());
  const startIdempotencyKey = useRef(createIdempotencyKey());
  const [activeInterview, setActiveInterview] = useState(null);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [answerError, setAnswerError] = useState("");
  const [answerStatusMessage, setAnswerStatusMessage] = useState("");
  const [feedbackByQuestion, setFeedbackByQuestion] = useState({});
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isNextQuestionLoading, setIsNextQuestionLoading] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [nextQuestionError, setNextQuestionError] = useState("");
  const [nextQuestionStatusMessage, setNextQuestionStatusMessage] =
    useState("");
  const [submittedAnswerIds, setSubmittedAnswerIds] = useState({});
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isReady = Boolean(selectedType && selectedLevel);

  function selectType(value) {
    if (value !== selectedType) {
      startIdempotencyKey.current = createIdempotencyKey();
    }
    setSelectedType(value);
    setFormError("");
    setStatusMessage("");
  }

  function selectLevel(value) {
    if (value !== selectedLevel) {
      startIdempotencyKey.current = createIdempotencyKey();
    }
    setSelectedLevel(value);
    setFormError("");
    setStatusMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isReady) {
      setFormError("Choose an interview type and level to start.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setStatusMessage("Preparing your first question...");

    try {
      const result = await startInterview({
        idempotencyKey: startIdempotencyKey.current,
        interviewType: selectedType,
        level: selectedLevel,
      });

      if (!isInterviewStartResult(result, selectedType, selectedLevel)) {
        throw new Error("Interview could not be started. Please try again.");
      }

      setActiveInterview(result);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage("");
      setFormError(
        `${
          error?.message || "Unable to start this interview."
        } Your choices are still here. Press Start interview to retry.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateAnswerDraft(questionId, value) {
    setAnswerDrafts((currentDrafts) => ({
      ...currentDrafts,
      [questionId]: value,
    }));
    setAnswerError("");
    setAnswerStatusMessage("");
  }

  async function handleAnswerSubmit(event, interviewId, questionId) {
    event.preventDefault();

    const answer = answerDrafts[questionId] || "";

    if (!answer.trim()) {
      setAnswerError("Enter an answer before requesting feedback.");
      setAnswerStatusMessage("");
      return;
    }

    setIsAnswerSubmitting(true);
    setAnswerError("");
    setAnswerStatusMessage("Saving your answer...");

    try {
      const result = await submitTextAnswer({
        idempotencyKey: answerIdempotencyKey.current,
        interviewId,
        questionId,
        text: answer,
      });

      if (!isSavedAnswerResult(result)) {
        throw new Error("Answer could not be saved. Please try again.");
      }

      setSubmittedAnswerIds((currentIds) => ({
        ...currentIds,
        [questionId]: result.answer.id,
      }));
      setFeedbackByQuestion((currentFeedback) => ({
        ...currentFeedback,
        [questionId]: result.feedback,
      }));
      answerIdempotencyKey.current = createIdempotencyKey();
      setAnswerStatusMessage("Your answer is saved. Feedback is ready.");
    } catch (error) {
      setAnswerStatusMessage("");
      setAnswerError(
        `${error?.message || "Answer could not be saved."} Your draft is still here. Press Submit for feedback to retry.`,
      );
    } finally {
      setIsAnswerSubmitting(false);
    }
  }

  async function handleCompleteInterview(interviewId) {
    setIsCompleting(true);
    setCompletionError("");

    try {
      const result = await completeInterview({ interviewId });

      if (!isCompletedInterviewResult(result)) {
        throw new Error("Interview could not be completed. Please try again.");
      }

      navigate(`/practice/${result.interview.id}/results`);
    } catch (error) {
      setCompletionError(
        `${error?.message || "Interview could not be completed."} Your saved feedback is still here. Press Complete session to retry.`,
      );
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleNextQuestion(interviewId, currentQuestionOrder) {
    setIsNextQuestionLoading(true);
    setNextQuestionError("");
    setNextQuestionStatusMessage("Preparing your next question...");

    try {
      const result = await generateNextQuestion({
        idempotencyKey: nextQuestionIdempotencyKey.current,
        interviewId,
      });

      if (
        !isGeneratedQuestionResult(result?.question, currentQuestionOrder + 1)
      ) {
        throw new Error("Next question could not be loaded. Please try again.");
      }

      setActiveInterview((currentInterview) =>
        currentInterview?.interview.id === interviewId
          ? { ...currentInterview, question: result.question }
          : currentInterview,
      );
      setAnswerError("");
      setAnswerStatusMessage("");
      setNextQuestionStatusMessage("");
      nextQuestionIdempotencyKey.current = createIdempotencyKey();
    } catch (error) {
      setNextQuestionStatusMessage("");
      setNextQuestionError(
        `${error?.message || "Next question could not be loaded."} Your saved feedback is still here. Press Next question to retry.`,
      );
    } finally {
      setIsNextQuestionLoading(false);
    }
  }

  if (activeInterview) {
    const { interview, question } = activeInterview;
    const answerDraft = answerDrafts[question.id] || "";
    const feedback = feedbackByQuestion[question.id];
    const progress = Math.min(
      (question.order / maxQuestionsPerInterview) * 100,
      100,
    );
    const levelLabel =
      levels.find(({ value }) => value === interview.level)?.label ||
      interview.level;

    return (
      <>
        <section className="page-heading compact-heading">
          <div>
            <p className="eyebrow">Interview active</p>
            <h1>{interview.interviewType} practice</h1>
            <p className="page-description">{levelLabel} level</p>
          </div>
        </section>
        <Card className="active-question-card">
          <div className="question-meta">
            <p className="question-count">
              Question {question.order} of {maxQuestionsPerInterview}
            </p>
            <span className="question-status">Saved</span>
          </div>
          <div
            aria-label={`Question ${question.order} of ${maxQuestionsPerInterview}`}
            aria-valuemax={maxQuestionsPerInterview}
            aria-valuemin={1}
            aria-valuenow={question.order}
            className="question-progress"
            role="progressbar"
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="question-prompt">{question.prompt}</p>
        </Card>
        <form
          className="answer-form"
          noValidate
          onSubmit={(event) =>
            handleAnswerSubmit(event, interview.id, question.id)
          }
        >
          <label className="answer-label" htmlFor={`answer-${question.id}`}>
            Your answer
          </label>
          <textarea
            aria-describedby={`answer-count-${question.id}`}
            className="answer-input"
            id={`answer-${question.id}`}
            onChange={(event) =>
              updateAnswerDraft(question.id, event.target.value)
            }
            placeholder="Organize your response, explain your reasoning, and include a concrete example."
            value={answerDraft}
          />
          <div className="answer-footer">
            <p className="character-count" id={`answer-count-${question.id}`}>
              {answerDraft.length} characters
            </p>
            <Button
              disabled={
                isAnswerSubmitting || Boolean(submittedAnswerIds[question.id])
              }
              isLoading={isAnswerSubmitting}
              loadingLabel="Saving answer..."
              type="submit"
            >
              {submittedAnswerIds[question.id]
                ? "Answer saved"
                : "Submit for feedback"}
            </Button>
          </div>
          {answerError ? (
            <InlineAlert tone="error">{answerError}</InlineAlert>
          ) : null}
          {answerStatusMessage ? (
            <InlineAlert tone="info">
              <span aria-live="polite" className="alert-row">
                {isAnswerSubmitting ? (
                  <Loader2 aria-hidden="true" size={18} />
                ) : null}
                {answerStatusMessage}
              </span>
            </InlineAlert>
          ) : null}
        </form>
        {feedback ? (
          <section
            aria-labelledby="feedback-heading"
            className="feedback-section"
          >
            <div className="feedback-heading">
              <div>
                <p className="eyebrow">Practice feedback</p>
                <h2 id="feedback-heading">Feedback</h2>
              </div>
              <div className="overall-score" role="status">
                <span>Overall</span>
                <strong>{feedback.overallScore}/100</strong>
                <span>{getScoreLabel(feedback.overallScore)}</span>
              </div>
            </div>
            <div className="feedback-score-grid">
              {feedbackDimensions.map(({ key, label }) => (
                <dl className="feedback-score" key={key}>
                  <dt>{label}</dt>
                  <dd>{feedback[key]}/100</dd>
                  <dd>{getScoreLabel(feedback[key])}</dd>
                </dl>
              ))}
            </div>
            <div className="feedback-details">
              <section aria-labelledby="strengths-heading">
                <h3 id="strengths-heading">Strengths</h3>
                <ul>
                  {feedback.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="improvements-heading">
                <h3 id="improvements-heading">Improve next</h3>
                <ul>
                  {feedback.improvements.map((improvement) => (
                    <li key={improvement}>{improvement}</li>
                  ))}
                </ul>
              </section>
            </div>
            <section
              aria-labelledby="next-step-heading"
              className="feedback-next-step"
            >
              <h3 id="next-step-heading">Next step</h3>
              <p>{feedback.nextStep}</p>
            </section>
            <p className="feedback-disclaimer">
              AI feedback supports interview practice and may not be perfectly
              accurate. It is not a hiring decision.
            </p>
            <div className="feedback-actions">
              {question.order < maxQuestionsPerInterview ? (
                <>
                  <Button
                    disabled={isCompleting}
                    isLoading={isNextQuestionLoading}
                    loadingLabel="Preparing next question..."
                    onClick={() =>
                      handleNextQuestion(interview.id, question.order)
                    }
                  >
                    Next question
                  </Button>
                  <Button
                    className="button--secondary"
                    disabled={isNextQuestionLoading || isCompleting}
                    isLoading={isCompleting}
                    loadingLabel="Ending session..."
                    onClick={() => handleCompleteInterview(interview.id)}
                  >
                    End session early
                  </Button>
                </>
              ) : (
                <Button
                  isLoading={isCompleting}
                  loadingLabel="Completing session..."
                  onClick={() => handleCompleteInterview(interview.id)}
                >
                  Complete session
                </Button>
              )}
            </div>
            {nextQuestionError ? (
              <InlineAlert tone="error">{nextQuestionError}</InlineAlert>
            ) : null}
            {nextQuestionStatusMessage ? (
              <InlineAlert tone="info">
                <span aria-live="polite" className="alert-row">
                  <Loader2 aria-hidden="true" size={18} />
                  {nextQuestionStatusMessage}
                </span>
              </InlineAlert>
            ) : null}
            {completionError ? (
              <InlineAlert tone="error">{completionError}</InlineAlert>
            ) : null}
          </section>
        ) : null}
      </>
    );
  }

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Practice</p>
          <h1>Start a mock interview</h1>
          <p className="page-description">
            Choose the kind of conversation you want to practise.
          </p>
        </div>
      </section>
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      {statusMessage ? (
        <InlineAlert tone="info">
          <span className="alert-row">
            {isSubmitting ? <Loader2 aria-hidden="true" size={18} /> : null}
            {statusMessage}
          </span>
        </InlineAlert>
      ) : null}
      <form className="setup-form" noValidate onSubmit={handleSubmit}>
        <fieldset className="setup-fieldset">
          <legend>Choose interview type</legend>
          <div className="choice-grid" aria-describedby="type-help">
            {interviewTypes.map(({ description, icon: Icon, title, value }) => {
              const isSelected = selectedType === value;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`choice-card choice-card-button${
                    isSelected ? " is-selected" : ""
                  }`}
                  key={value}
                  onClick={() => selectType(value)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="choice-icon" />
                  <span className="choice-title">{title}</span>
                  <span className="choice-description">{description}</span>
                  <span className="choice-status">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    {isSelected ? "Selected" : "Choose"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="field-help" id="type-help">
            Choose one supported V1 practice type.
          </p>
        </fieldset>

        <fieldset className="setup-fieldset">
          <legend>Choose your level</legend>
          <div className="level-options">
            {levels.map(({ description, label, value }) => (
              <label
                className={`level-option${
                  selectedLevel === value ? " is-selected" : ""
                }`}
                key={value}
              >
                <input
                  checked={selectedLevel === value}
                  name="level"
                  onChange={() => selectLevel(value)}
                  type="radio"
                  value={value}
                />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Card className="resume-context-card">
          <h2>Resume context</h2>
          <p>
            Resume tailoring is optional and arrives in Week 5. You can start
            practice without a resume today.
          </p>
        </Card>

        <div className="setup-actions">
          <Button
            disabled={!isReady || isSubmitting}
            isLoading={isSubmitting}
            type="submit"
          >
            Start interview
          </Button>
        </div>
      </form>
    </>
  );
}

export default PracticePage;

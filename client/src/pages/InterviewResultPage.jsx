import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getInterview } from "../api/interviewApi.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import { hasValidAdaptiveQuestionMetadata } from "../utils/interviewQuestion.js";

const interviewTypes = [
  "DSA",
  "HR",
  "System Design",
  "Role Simulation",
  "Project Defense",
];
const interviewLevels = ["beginner", "intermediate", "advanced"];
const maxQuestionsPerInterview = 5;
const maxQuestionPromptLength = 2000;
const maxTextAnswerLength = 10000;
const maxFeedbackItemLength = 500;
const maxRecommendationLength = 1000;

function getScoreLabel(score) {
  if (score >= 85) {
    return "Strong";
  }

  if (score >= 70) {
    return "Solid";
  }

  return "Developing";
}

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function isText(value, maximumLength) {
  return (
    typeof value === "string" &&
    Boolean(value.trim()) &&
    value.length <= maximumLength
  );
}

function isTextList(value) {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 3 &&
    value.every((item) => isText(item, maxFeedbackItemLength))
  );
}

function isDateString(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isFeedback(feedback) {
  return Boolean(
    feedback &&
    isScore(feedback.overallScore) &&
    isScore(feedback.accuracyScore) &&
    isScore(feedback.clarityScore) &&
    isScore(feedback.confidenceScore) &&
    isTextList(feedback.strengths) &&
    isTextList(feedback.improvements) &&
    isText(feedback.nextStep, maxRecommendationLength),
  );
}

function isSummary(summary) {
  return Boolean(
    summary &&
    isScore(summary.overallScore) &&
    isScore(summary.accuracyScore) &&
    isScore(summary.clarityScore) &&
    isScore(summary.confidenceScore) &&
    isTextList(summary.strengths) &&
    isTextList(summary.improvements) &&
    isText(summary.recommendation, maxRecommendationLength),
  );
}

function isSavedAnswer(answer) {
  return Boolean(
    isText(answer?.id, 100) &&
    ["text", "voice"].includes(answer.inputMode) &&
    isText(answer.text, maxTextAnswerLength) &&
    isDateString(answer.submittedAt) &&
    (!answer.feedback || isFeedback(answer.feedback)),
  );
}

function isSavedQuestion(question, index) {
  return Boolean(
    isText(question?.id, 100) &&
    question.order === index + 1 &&
    isText(question.prompt, maxQuestionPromptLength) &&
    Array.isArray(question.answers) &&
    question.answers.length <= 1 &&
    question.answers.every(isSavedAnswer) &&
    hasValidAdaptiveQuestionMetadata(question),
  );
}

function hasValidParentLinks(questions) {
  return questions.every(
    (question, index) =>
      !question.parentQuestionId ||
      questions
        .slice(0, index)
        .some(
          (earlierQuestion) => earlierQuestion.id === question.parentQuestionId,
        ),
  );
}

function isContextSnapshot(value) {
  return Boolean(
    value &&
    Object.keys(value).length === 2 &&
    ["job_target", "candidate_project"].includes(value.kind) &&
    isText(value.label, 160),
  );
}

function isCompletedInterview(interview) {
  return Boolean(
    isText(interview?.id, 100) &&
    interviewTypes.includes(interview.interviewType) &&
    interviewLevels.includes(interview.level) &&
    interview.status === "completed" &&
    isDateString(interview.startedAt) &&
    isDateString(interview.completedAt) &&
    Date.parse(interview.completedAt) >= Date.parse(interview.startedAt) &&
    isSummary(interview.summary) &&
    Array.isArray(interview.questions) &&
    interview.questions.length >= 1 &&
    interview.questions.length <= maxQuestionsPerInterview &&
    interview.questions.every(isSavedQuestion) &&
    hasValidParentLinks(interview.questions) &&
    (!Object.hasOwn(interview, "contextSnapshot") ||
      isContextSnapshot(interview.contextSnapshot)) &&
    (!Object.hasOwn(interview, "evidenceSyncStatus") ||
      ["ready", "pending"].includes(interview.evidenceSyncStatus)) &&
    (!Object.hasOwn(interview, "retestComparison") ||
      isRetestComparison(interview.retestComparison)) &&
    interview.questions.some((question) =>
      question.answers.some((answer) => isFeedback(answer.feedback)),
    ),
  );
}

function isRetestComparison(value) {
  return Boolean(
    value &&
    typeof value.skillKey === "string" &&
    typeof value.skillLabel === "string" &&
    isScore(value.previousMasteryScore) &&
    isScore(value.currentMasteryScore) &&
    ["provisional", "emerging", "established"].includes(
      value.previousConfidence,
    ) &&
    ["provisional", "emerging", "established"].includes(
      value.currentConfidence,
    ),
  );
}

function replayMetadata(question) {
  if (!Object.hasOwn(question, "decisionType")) return null;
  return `${question.decisionType.replaceAll("_", " ")} · ${question.difficulty} · ${question.testedSkillKeys.join(", ")}`;
}

function RetestComparison({ comparison }) {
  if (!comparison) return null;
  const change =
    comparison.currentMasteryScore - comparison.previousMasteryScore;
  return (
    <section className="retest-comparison" aria-label="Retest comparison">
      <p className="eyebrow">Retest comparison</p>
      <h2>{comparison.skillLabel}</h2>
      <p>
        {comparison.previousMasteryScore} to {comparison.currentMasteryScore}{" "}
        mastery ({change >= 0 ? "+" : ""}
        {change}). Confidence: {comparison.previousConfidence} to{" "}
        {comparison.currentConfidence}.
      </p>
      <p>Evidence remains confidence-labelled and is not a hiring decision.</p>
    </section>
  );
}

function RetestComparisonStatus({ interview }) {
  if (
    interview.sessionPurpose !== "targeted_practice" ||
    interview.retestComparison
  ) {
    return null;
  }

  return (
    <p className="replay-metadata" role="status">
      {interview.evidenceSyncStatus === "pending"
        ? "Retest comparison is still synchronizing."
        : "Retest comparison is unavailable for this saved session."}
    </p>
  );
}

function FeedbackDetails({ feedback, headingPrefix }) {
  return (
    <div className="saved-feedback">
      <div className="feedback-score-grid">
        {[
          ["Overall", feedback.overallScore],
          ["Accuracy", feedback.accuracyScore],
          ["Clarity", feedback.clarityScore],
          ["Confidence", feedback.confidenceScore],
        ].map(([label, score]) => (
          <dl className="feedback-score" key={label}>
            <dt>{label}</dt>
            <dd>{score}/100</dd>
            <dd>{getScoreLabel(score)}</dd>
          </dl>
        ))}
      </div>
      <div className="feedback-details">
        <section aria-labelledby={`${headingPrefix}-strengths`}>
          <h4 id={`${headingPrefix}-strengths`}>Strengths</h4>
          <ul>
            {feedback.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${headingPrefix}-improvements`}>
          <h4 id={`${headingPrefix}-improvements`}>Improve next</h4>
          <ul>
            {feedback.improvements.map((improvement) => (
              <li key={improvement}>{improvement}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="feedback-next-step">
        <h4>Next step</h4>
        <p>{feedback.nextStep}</p>
      </section>
    </div>
  );
}

function InterviewResultPage() {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadInterview = useCallback(
    async (signal) => {
      setError("");

      try {
        const result = await getInterview({ interviewId, signal });

        if (!isCompletedInterview(result?.interview)) {
          throw new Error("This interview is not ready to review yet.");
        }

        setInterview(result.interview);
      } catch (loadError) {
        if (!signal?.aborted && loadError?.name !== "AbortError") {
          setError(
            loadError?.message || "Interview result could not be loaded.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [interviewId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadInterview(controller.signal));

    return () => controller.abort();
  }, [loadInterview]);

  if (isLoading) {
    return <p className="loading-state">Loading saved result...</p>;
  }

  if (error) {
    return (
      <section className="result-recovery">
        <InlineAlert tone="error">{error}</InlineAlert>
        <Button
          onClick={() => {
            setIsLoading(true);
            loadInterview();
          }}
        >
          Try again
        </Button>
      </section>
    );
  }

  const { summary } = interview;

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Saved practice result</p>
          <h1>{interview.interviewType} practice</h1>
          <p className="page-description">
            Completed {new Date(interview.completedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="page-actions">
          <Link className="button" to="/dashboard">
            View dashboard
          </Link>
          <Link className="button button--secondary" to="/practice">
            Start another session
          </Link>
        </div>
      </section>
      <section aria-labelledby="summary-heading" className="result-summary">
        <div className="feedback-heading">
          <div>
            <p className="eyebrow">Session summary</p>
            <h2 id="summary-heading">Your practice baseline</h2>
          </div>
          <div className="overall-score">
            <span>Overall</span>
            <strong>{summary.overallScore}/100</strong>
            <span>{getScoreLabel(summary.overallScore)}</span>
          </div>
        </div>
        <div className="feedback-score-grid">
          {[
            ["Accuracy", summary.accuracyScore],
            ["Clarity", summary.clarityScore],
            ["Confidence", summary.confidenceScore],
          ].map(([label, score]) => (
            <dl className="feedback-score" key={label}>
              <dt>{label}</dt>
              <dd>{score}/100</dd>
              <dd>{getScoreLabel(score)}</dd>
            </dl>
          ))}
        </div>
        <div className="feedback-details">
          <section>
            <h3>Session strengths</h3>
            <ul>
              {summary.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Session improvements</h3>
            <ul>
              {summary.improvements.map((improvement) => (
                <li key={improvement}>{improvement}</li>
              ))}
            </ul>
          </section>
        </div>
        <section className="feedback-next-step">
          <h3>Recommended exercise</h3>
          <p>{summary.recommendation}</p>
        </section>
      </section>
      <section aria-labelledby="answers-heading" className="saved-answers">
        <h2 id="answers-heading">Saved answers and feedback</h2>
        <p className="page-description">
          Use this feedback to guide your next practice step. It can be
          imperfect and is not a hiring decision.
        </p>
        {interview.contextSnapshot ? (
          <p className="replay-context">
            Saved {interview.contextSnapshot.kind.replaceAll("_", " ")} context:{" "}
            {interview.contextSnapshot.label}
          </p>
        ) : null}
        <RetestComparison comparison={interview.retestComparison} />
        <RetestComparisonStatus interview={interview} />
        <ol className="replay-timeline" aria-label="Interview replay timeline">
          {interview.questions.map((question) =>
            question.answers.map((answer) => (
              <li className="replay-timeline-item" key={answer.id}>
                <article className="saved-answer">
                  <p className="question-count">Question {question.order}</p>
                  {question.parentQuestionId ? (
                    <p className="replay-link">
                      Follow-up to an earlier question
                    </p>
                  ) : null}
                  {replayMetadata(question) ? (
                    <p className="replay-metadata">
                      {replayMetadata(question)}
                    </p>
                  ) : (
                    <p className="replay-metadata">
                      No adaptive metadata recorded.
                    </p>
                  )}
                  <h3>{question.prompt}</h3>
                  <p className="saved-answer-text">{answer.text}</p>
                  {answer.feedback ? (
                    <FeedbackDetails
                      feedback={answer.feedback}
                      headingPrefix={`answer-${answer.id}`}
                    />
                  ) : (
                    <p className="saved-answer-score">
                      Feedback was not completed for this saved answer.
                    </p>
                  )}
                </article>
              </li>
            )),
          )}
        </ol>
      </section>
    </>
  );
}

export default InterviewResultPage;

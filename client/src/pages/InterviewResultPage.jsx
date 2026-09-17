import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getInterview } from "../api/interviewApi.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

function getScoreLabel(score) {
  if (score >= 85) {
    return "Strong";
  }

  if (score >= 70) {
    return "Solid";
  }

  return "Developing";
}

function isCompletedInterview(interview) {
  return Boolean(
    interview?.id &&
    interview.status === "completed" &&
    typeof interview.completedAt === "string" &&
    Number.isInteger(interview.summary?.overallScore) &&
    Array.isArray(interview.questions),
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
        <Link className="button button--secondary" to="/practice">
          Start another session
        </Link>
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
        <section className="feedback-next-step">
          <h3>Recommended exercise</h3>
          <p>{summary.recommendation}</p>
        </section>
      </section>
      <section aria-labelledby="answers-heading" className="saved-answers">
        <h2 id="answers-heading">Saved answers and feedback</h2>
        {interview.questions.map((question) =>
          question.answers.map((answer) => (
            <article className="saved-answer" key={answer.id}>
              <p className="question-count">Question {question.order}</p>
              <h3>{question.prompt}</h3>
              <p className="saved-answer-text">{answer.text}</p>
              {answer.feedback ? (
                <p className="saved-answer-score">
                  Feedback: {answer.feedback.overallScore}/100,{" "}
                  {getScoreLabel(answer.feedback.overallScore)}
                </p>
              ) : null}
            </article>
          )),
        )}
      </section>
    </>
  );
}

export default InterviewResultPage;

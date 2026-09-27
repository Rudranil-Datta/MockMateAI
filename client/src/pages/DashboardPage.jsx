import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { getAnalyticsSummary } from "../api/analyticsApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import LoadingState from "../components/common/LoadingState.jsx";

const chartWidth = 640;
const chartHeight = 240;
const chartPadding = 32;
const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function getScoreLabel(score) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Solid";
  return "Developing";
}

function formatDate(date) {
  return dateFormatter.format(new Date(date));
}

function getTrendSummary(trend) {
  if (trend.length === 1) {
    return `Your first recorded score is ${trend[0].overallScore} out of 100.`;
  }

  const change = trend.at(-1).overallScore - trend[0].overallScore;
  if (change === 0) {
    return `Your displayed scores begin and end at ${trend[0].overallScore} out of 100.`;
  }

  return `Your latest score is ${Math.abs(change)} points ${
    change > 0 ? "higher" : "lower"
  } than your earliest displayed score.`;
}

function MetricCard({ label, support, value }) {
  return (
    <Card className="dashboard-metric-card">
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-support">{support}</span>
    </Card>
  );
}

function ScoreBar({ label, score }) {
  return (
    <div
      className="score-bar"
      aria-label={`${label}: ${score} out of 100, ${getScoreLabel(score)}`}
    >
      <div className="score-bar-heading">
        <span>{label}</span>
        <strong>{score}</strong>
      </div>
      <div className="score-bar-track" aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TrendChart({ trend }) {
  const plotWidth = chartWidth - chartPadding * 2;
  const plotHeight = chartHeight - chartPadding * 2;
  const points = trend.map((point, index) => ({
    ...point,
    x:
      trend.length === 1
        ? chartWidth / 2
        : chartPadding + (index * plotWidth) / (trend.length - 1),
    y: chartPadding + ((100 - point.overallScore) / 100) * plotHeight,
  }));
  const summary = getTrendSummary(trend);

  return (
    <Card className="dashboard-panel trend-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="eyebrow">Score trend</p>
          <h2 id="score-trend-title">Progress over time</h2>
        </div>
        <TrendingUp aria-hidden="true" className="section-icon" />
      </div>
      <p id="score-trend-description" className="trend-summary">
        {summary}
      </p>
      <div className="trend-chart-frame">
        <svg
          aria-labelledby="score-trend-title score-trend-description"
          className="trend-chart"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {[0, 50, 100].map((score) => {
            const y = chartPadding + ((100 - score) / 100) * plotHeight;
            return (
              <g key={score}>
                <line
                  className="trend-grid-line"
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={y}
                  y2={y}
                />
                <text className="trend-axis-label" x="2" y={y + 4}>
                  {score}
                </text>
              </g>
            );
          })}
          {points.length > 1 ? (
            <polyline
              className="trend-line"
              points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
            />
          ) : null}
          {points.map(({ completedAt, overallScore, x, y }) => (
            <g key={completedAt}>
              <circle className="trend-point" cx={x} cy={y} r="6" />
              <text className="trend-point-label" x={x} y={y - 12}>
                {overallScore}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <ol className="trend-data-list" aria-label="Score trend values">
        {trend.map((point) => (
          <li key={point.completedAt}>
            <time dateTime={point.completedAt}>
              {formatDate(point.completedAt)}
            </time>
            <strong>{point.overallScore}</strong>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function PerformanceBreakdown({ analytics }) {
  const dimensions = [
    ["Accuracy", analytics.summary.averageAccuracyScore],
    ["Clarity", analytics.summary.averageClarityScore],
    ["Confidence", analytics.summary.averageConfidenceScore],
  ];

  return (
    <Card className="dashboard-panel breakdown-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="eyebrow">Performance mix</p>
          <h2>Where your scores stand</h2>
        </div>
      </div>
      <h3 className="dashboard-subheading">Skill dimensions</h3>
      <div className="score-bar-list">
        {dimensions.map(([label, score]) => (
          <ScoreBar key={label} label={label} score={score} />
        ))}
      </div>
      <h3 className="dashboard-subheading dashboard-subheading--spaced">
        Interview types
      </h3>
      <div className="score-bar-list">
        {analytics.typeAverages.map(
          ({ averageOverallScore, interviewType }) => (
            <ScoreBar
              key={interviewType}
              label={interviewType}
              score={averageOverallScore}
            />
          ),
        )}
      </div>
    </Card>
  );
}

function RecentSessions({ sessions }) {
  return (
    <Card className="dashboard-panel history-panel">
      <div className="dashboard-panel-heading history-heading">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h2>Review saved practice</h2>
        </div>
        <CalendarDays aria-hidden="true" className="section-icon" />
      </div>
      <ol className="session-history-list">
        {sessions.map((session) => (
          <li key={session.id} className="session-history-item">
            <div className="session-history-main">
              <span className="session-type">{session.interviewType}</span>
              <span className="session-level">{session.level}</span>
              <time dateTime={session.completedAt}>
                {formatDate(session.completedAt)}
              </time>
            </div>
            <div className="session-history-actions">
              <span
                className="session-score"
                aria-label={`${session.overallScore} out of 100, ${getScoreLabel(
                  session.overallScore,
                )}`}
              >
                <strong>{session.overallScore}</strong>
                <small>{getScoreLabel(session.overallScore)}</small>
              </span>
              <Link
                className="text-link session-result-link"
                to={`/practice/${session.id}/results`}
              >
                View result <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DashboardLoading() {
  return (
    <section aria-label="Dashboard loading">
      <LoadingState label="Loading your progress…" />
      <div className="metric-grid dashboard-skeleton-grid" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <Card key={item} className="dashboard-skeleton-card">
            <span />
            <strong />
            <span />
          </Card>
        ))}
      </div>
    </section>
  );
}

function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    controllerRef.current = controller;
    requestIdRef.current = requestId;
    setError("");
    setIsLoading(true);

    try {
      const nextAnalytics = await getAnalyticsSummary({
        signal: controller.signal,
      });

      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setAnalytics(nextAnalytics);
      }
    } catch {
      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setAnalytics(null);
        setError("We couldn't load your dashboard. Please try again.");
      }
    } finally {
      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) loadDashboard();
    });

    return () => {
      isMounted = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [loadDashboard]);

  const isEmpty = analytics?.summary.completedSessions === 0;
  const latestScore = analytics?.recentSessions[0]?.overallScore;

  return (
    <>
      <section className="page-heading dashboard-hero">
        <div>
          <p className="eyebrow">Performance dashboard</p>
          <h1>Your practice, in focus.</h1>
          <p className="page-description">
            See what you have completed, how your scores compare, and where to
            practise next.
          </p>
        </div>
        <Link className="button" to="/practice">
          Start practice <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>

      {isLoading ? <DashboardLoading /> : null}
      {!isLoading && error ? (
        <Card className="dashboard-state-card">
          <InlineAlert tone="error">{error}</InlineAlert>
          <Button onClick={loadDashboard}>Retry dashboard</Button>
        </Card>
      ) : null}

      {!isLoading && analytics ? (
        <div className="dashboard-content">
          <section className="metric-grid" aria-label="Practice overview">
            <MetricCard
              label="Overall average"
              support={
                isEmpty
                  ? "Complete a session to establish your baseline."
                  : `${getScoreLabel(
                      analytics.summary.averageOverallScore,
                    )} across completed sessions.`
              }
              value={
                isEmpty ? "--" : `${analytics.summary.averageOverallScore}`
              }
            />
            <MetricCard
              label="Sessions completed"
              support={
                isEmpty
                  ? "Your saved practice history will appear here."
                  : "Saved and ready to review."
              }
              value={analytics.summary.completedSessions}
            />
            <MetricCard
              label="Latest score"
              support={
                isEmpty
                  ? "Your newest completed score will appear here."
                  : `${getScoreLabel(latestScore)} in your latest session.`
              }
              value={isEmpty ? "--" : `${latestScore}`}
            />
          </section>

          {isEmpty ? (
            <Card className="dashboard-empty-card empty-state">
              <span className="dashboard-empty-icon" aria-hidden="true">
                <TrendingUp size={28} />
              </span>
              <p className="eyebrow">Your baseline starts here</p>
              <h2>No completed sessions yet</h2>
              <p>
                Complete one mock interview to unlock score trends, skill
                breakdowns, and saved-session history.
              </p>
              <Link className="button button--secondary" to="/practice">
                Start your first session
              </Link>
            </Card>
          ) : (
            <>
              <section className="dashboard-grid" aria-label="Score analysis">
                <TrendChart trend={analytics.trend} />
                <PerformanceBreakdown analytics={analytics} />
              </section>
              <RecentSessions sessions={analytics.recentSessions} />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

export default DashboardPage;

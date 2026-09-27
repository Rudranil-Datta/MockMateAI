import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./DashboardPage.jsx";

const getAnalyticsSummary = vi.hoisted(() => vi.fn());

vi.mock("../api/analyticsApi.js", () => ({ getAnalyticsSummary }));

const analytics = {
  recentSessions: [
    {
      completedAt: "2026-09-23T12:00:00.000Z",
      id: "68d28d4fe533c5c96697b002",
      interviewType: "HR",
      level: "intermediate",
      overallScore: 84,
    },
    {
      completedAt: "2026-09-22T12:00:00.000Z",
      id: "68d13bcfe533c5c96697b001",
      interviewType: "DSA",
      level: "advanced",
      overallScore: 76,
    },
  ],
  summary: {
    averageAccuracyScore: 82,
    averageClarityScore: 77,
    averageConfidenceScore: 79,
    averageOverallScore: 80,
    completedSessions: 2,
  },
  trend: [
    { completedAt: "2026-09-22T12:00:00.000Z", overallScore: 76 },
    { completedAt: "2026-09-23T12:00:00.000Z", overallScore: 84 },
  ],
  typeAverages: [
    { averageOverallScore: 76, interviewType: "DSA" },
    { averageOverallScore: 84, interviewType: "HR" },
  ],
};

const emptyAnalytics = {
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
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    getAnalyticsSummary.mockReset();
  });

  it("renders accurate metrics, accessible analysis, and saved-session links", async () => {
    getAnalyticsSummary.mockResolvedValue(analytics);
    renderPage();

    expect(screen.getByText("Loading your progress…")).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Progress over time" }),
    ).toBeVisible();

    const overview = screen.getByRole("region", { name: "Practice overview" });
    expect(within(overview).getByText("80")).toBeVisible();
    expect(within(overview).getByText("2")).toBeVisible();
    expect(within(overview).getByText("84")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: /Progress over time.*8 points higher/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Accuracy: 82 out of 100, Solid"),
    ).toBeVisible();
    expect(screen.getByLabelText("DSA: 76 out of 100, Solid")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Score trend values" }),
    ).toHaveTextContent("Sep 22, 2026");

    const resultLinks = screen.getAllByRole("link", { name: "View result" });
    expect(resultLinks).toHaveLength(2);
    expect(resultLinks[0]).toHaveAttribute(
      "href",
      "/practice/68d28d4fe533c5c96697b002/results",
    );
    expect(screen.getByText("intermediate")).toBeVisible();
    expect(screen.getByText("advanced")).toBeVisible();
  });

  it("renders an honest empty state with practice navigation", async () => {
    getAnalyticsSummary.mockResolvedValue(emptyAnalytics);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "No completed sessions yet" }),
    ).toBeVisible();
    expect(screen.getByText("Sessions completed")).toBeVisible();
    expect(screen.getByText("0")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Start your first session" }),
    ).toHaveAttribute("href", "/practice");
    expect(
      screen.queryByRole("heading", { name: "Progress over time" }),
    ).not.toBeInTheDocument();
  });

  it("shows a safe failure and replaces it after retry", async () => {
    getAnalyticsSummary
      .mockRejectedValueOnce(new Error("private server detail"))
      .mockResolvedValueOnce(analytics);
    renderPage();

    expect(
      await screen.findByText(
        "We couldn't load your dashboard. Please try again.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private server detail")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry dashboard" }));
    expect(
      await screen.findByRole("heading", { name: "Progress over time" }),
    ).toBeVisible();
    expect(getAnalyticsSummary).toHaveBeenCalledTimes(2);
  });

  it("renders a one-point trend without invalid line geometry", async () => {
    getAnalyticsSummary.mockResolvedValue({
      ...analytics,
      recentSessions: [analytics.recentSessions[0]],
      summary: { ...analytics.summary, completedSessions: 1 },
      trend: [analytics.trend[1]],
      typeAverages: [analytics.typeAverages[1]],
    });
    const { container } = renderPage();

    expect(
      await screen.findByText("Your first recorded score is 84 out of 100."),
    ).toBeVisible();
    expect(container.querySelector(".trend-line")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".trend-point")).toHaveLength(1);
  });

  it("renders all ten bounded trend points", async () => {
    const trend = Array.from({ length: 10 }, (_, index) => ({
      completedAt: new Date(Date.UTC(2026, 8, 10 + index)).toISOString(),
      overallScore: 70 + index,
    }));
    getAnalyticsSummary.mockResolvedValue({
      ...analytics,
      recentSessions: trend
        .map((point, index) => ({
          ...analytics.recentSessions[0],
          completedAt: point.completedAt,
          id: index.toString(16).padStart(24, "0"),
          overallScore: point.overallScore,
        }))
        .reverse(),
      summary: { ...analytics.summary, completedSessions: 10 },
      trend,
    });
    const { container } = renderPage();

    await screen.findByRole("heading", { name: "Progress over time" });
    expect(container.querySelectorAll(".trend-point")).toHaveLength(10);
    expect(
      screen.getByRole("list", { name: "Score trend values" }).children,
    ).toHaveLength(10);
  });

  it("aborts pending dashboard work when unmounted", async () => {
    let requestSignal;
    getAnalyticsSummary.mockImplementation(({ signal }) => {
      requestSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = renderPage();

    await waitFor(() => expect(requestSignal).toBeDefined());
    unmount();
    expect(requestSignal.aborted).toBe(true);
  });
});

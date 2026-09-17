import { ArrowRight, CalendarDays, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

function DashboardPage() {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Build interview confidence.</h1>
          <p className="page-description">
            Practice thoughtfully, review useful feedback, and see progress over
            time.
          </p>
        </div>
        <Link className="button" to="/practice">
          Start practice <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
      <InlineAlert>
        Your first interview session will appear here after authentication and
        setup are available.
      </InlineAlert>
      <section className="metric-grid" aria-label="Practice overview">
        <Card>
          <p className="metric-label">Overall average</p>
          <strong className="metric-value">--</strong>
          <span className="metric-support">Complete a session to begin.</span>
        </Card>
        <Card>
          <p className="metric-label">Sessions completed</p>
          <strong className="metric-value">0</strong>
          <span className="metric-support">
            Your practice history is ready when you are.
          </span>
        </Card>
        <Card>
          <p className="metric-label">Latest score</p>
          <strong className="metric-value">--</strong>
          <span className="metric-support">
            Feedback arrives after each answer.
          </span>
        </Card>
      </section>
      <section className="dashboard-grid">
        <Card className="feature-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">Next step</p>
              <h2>Start your first mock interview</h2>
            </div>
            <TrendingUp aria-hidden="true" className="section-icon" />
          </div>
          <p>
            Choose DSA, HR, or System Design, then answer one focused question
            at a time.
          </p>
          <Link className="text-link" to="/practice">
            Choose interview type <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </Card>
        <Card className="feature-card empty-state">
          <CalendarDays aria-hidden="true" className="empty-icon" />
          <h2>No sessions yet</h2>
          <p>Your completed sessions and feedback will be saved here.</p>
          <Button
            className="button--secondary"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to top
          </Button>
        </Card>
      </section>
    </>
  );
}

export default DashboardPage;

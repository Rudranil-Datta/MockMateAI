import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { getSkillProfile } from "../api/skillApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import LoadingState from "../components/common/LoadingState.jsx";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function SkillsPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const loadProfile = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      setProfile(await getSkillProfile());
    } catch (requestError) {
      setError(requestError?.message || "Skills could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  if (isLoading) return <LoadingState label="Loading skill evidence..." />;
  if (error)
    return (
      <Card className="dashboard-state-card">
        <InlineAlert tone="error">{error}</InlineAlert>
        <Button onClick={loadProfile}>Retry skills</Button>
      </Card>
    );

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Preparation workspace</p>
          <h1>Skills</h1>
          <p className="page-description">
            Your saved answers highlight what to practise next. They do not
            predict hiring outcomes.
          </p>
        </div>
      </section>
      {profile.evidenceSyncStatus === "pending" ? (
        <InlineAlert tone="info">
          Evidence is still synchronizing. Scores may update after recovery.
        </InlineAlert>
      ) : null}
      {profile.skills.length === 0 ? (
        <Card className="empty-state">
          <h2>No skill evidence yet</h2>
          <p>
            Complete a practice session to start building your
            confidence-labelled skill view.
          </p>
          <Link className="button" to="/practice">
            Start practice
          </Link>
        </Card>
      ) : (
        <section className="skill-card-grid" aria-label="Skill profile">
          {profile.skills.map((skill) => (
            <Card className="skill-card" key={skill.skillKey}>
              <p className="eyebrow">{skill.confidence} confidence</p>
              <h2>{skill.skillLabel}</h2>
              <strong>{skill.masteryScore}/100</strong>
              <p>
                {skill.masteryLabel.replaceAll("_", " ")} ·{" "}
                {skill.evidenceCount} evidence record
                {skill.evidenceCount === 1 ? "" : "s"}
              </p>
              <p>
                Last practised{" "}
                {dateFormatter.format(new Date(skill.lastPracticedAt))}
              </p>
              <p className="field-help">
                {skill.evidenceCount} saved attempt
                {skill.evidenceCount === 1 ? " supports" : "s support"} this
                confidence label. Focused practice adds evidence. It does not
                predict readiness.
              </p>
              <Link
                className="text-link"
                to={`/practice?focusSkillKey=${encodeURIComponent(skill.skillKey)}`}
              >
                Practise {skill.skillLabel} next{" "}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}

export default SkillsPage;

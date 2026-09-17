import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main className="public-page">
      <section className="public-panel">
        <p className="eyebrow">404</p>
        <h1>Page not found.</h1>
        <p>This route is not part of MockMateAI.</p>
        <Link className="button" to="/dashboard">
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}

export default NotFoundPage;

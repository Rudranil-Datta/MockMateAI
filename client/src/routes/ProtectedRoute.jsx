import { Navigate, Outlet, useLocation } from "react-router-dom";

import LoadingState from "../components/common/LoadingState.jsx";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

function ProtectedRoute() {
  const { authError, isAuthenticated, isAuthLoading, retrySession } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <LoadingState label="Restoring your session" />;
  }

  if (authError) {
    return (
      <main className="session-recovery">
        <h1>Unable to restore your session.</h1>
        <InlineAlert tone="error">{authError}</InlineAlert>
        <Button onClick={retrySession}>Retry</Button>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

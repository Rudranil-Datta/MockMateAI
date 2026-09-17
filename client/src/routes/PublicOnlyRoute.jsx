import { Navigate, Outlet } from "react-router-dom";

import LoadingState from "../components/common/LoadingState.jsx";
import useAuth from "../hooks/useAuth.js";

function PublicOnlyRoute() {
  const { isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return <LoadingState label="Restoring your session" />;
  }

  return isAuthenticated ? <Navigate replace to="/dashboard" /> : <Outlet />;
}

export default PublicOnlyRoute;

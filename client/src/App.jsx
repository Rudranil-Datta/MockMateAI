import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./layouts/AppShell.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InterviewResultPage from "./pages/InterviewResultPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PracticePage from "./pages/PracticePage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import PublicOnlyRoute from "./routes/PublicOnlyRoute.jsx";
import ResumesPage from "./pages/ResumesPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route
            path="/practice/:interviewId/results"
            element={<InterviewResultPage />}
          />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;

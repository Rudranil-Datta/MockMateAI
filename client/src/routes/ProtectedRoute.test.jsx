import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicOnlyRoute from "./PublicOnlyRoute.jsx";

const authContext = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("../hooks/useAuth.js", () => ({ default: authContext.useAuth }));

describe("authentication routes", () => {
  it("shows session restoration loading state", () => {
    authContext.useAuth.mockReturnValue({
      isAuthenticated: false,
      isAuthLoading: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Restoring your session")).toBeVisible();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("redirects signed-out protected access to login", () => {
    authContext.useAuth.mockReturnValue({
      isAuthenticated: false,
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login")).toBeVisible();
  });

  it("redirects signed-in public access to dashboard", () => {
    authContext.useAuth.mockReturnValue({
      isAuthenticated: true,
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<p>Login</p>} />
          </Route>
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeVisible();
  });

  it("shows retryable session recovery failure", () => {
    const retrySession = vi.fn();
    authContext.useAuth.mockReturnValue({
      authError: "Unable to reach MockMateAI.",
      isAuthenticated: false,
      isAuthLoading: false,
      retrySession,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Unable to reach MockMateAI.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retrySession).toHaveBeenCalledTimes(1);
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import { AuthProvider } from "./AuthContext.jsx";
import useAuth from "../hooks/useAuth.js";

const authApi = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("../api/authApi.js", () => ({
  getCurrentUser: authApi.getCurrentUser,
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
}));

function AuthStatus() {
  const { authError, isAuthLoading, user } = useAuth();
  return (
    <span>
      {isAuthLoading ? "loading" : authError || user?.email || "signed-out"}
    </span>
  );
}

describe("AuthProvider", () => {
  it("restores a safe current user once", async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      user: { email: "asha@example.com" },
    });

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await screen.findByText("asha@example.com");
    expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("treats an initial 401 as signed out", async () => {
    authApi.getCurrentUser.mockRejectedValueOnce(
      new ApiError("UNAUTHENTICATED", "Sign in to continue.", { status: 401 }),
    );

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("signed-out")).toBeVisible());
  });

  it("exposes a retryable initial session failure", async () => {
    authApi.getCurrentUser.mockRejectedValueOnce(
      new ApiError("NETWORK_ERROR", "Unable to reach MockMateAI.", {
        status: 0,
      }),
    );

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await screen.findByText("Unable to reach MockMateAI.");
  });
});

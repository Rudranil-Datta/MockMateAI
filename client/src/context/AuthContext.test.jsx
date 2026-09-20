import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import { AuthProvider } from "./AuthContext.jsx";
import useAuth from "../hooks/useAuth.js";

const authApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
}));

vi.mock("../api/authApi.js", () => ({
  getCurrentUser: authApi.getCurrentUser,
  login: authApi.login,
  logout: authApi.logout,
  signup: authApi.signup,
}));

function AuthStatus() {
  const { authError, isAuthLoading, logout, retrySession, user } = useAuth();
  return (
    <div>
      <span>
        {isAuthLoading ? "loading" : authError || user?.email || "signed-out"}
      </span>
      <button onClick={retrySession}>retry</button>
      <button onClick={() => logout().catch(() => undefined)}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    Object.values(authApi).forEach((mock) => mock.mockReset());
  });

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
    authApi.getCurrentUser
      .mockRejectedValueOnce(
        new ApiError("NETWORK_ERROR", "Unable to reach MockMateAI.", {
          status: 0,
        }),
      )
      .mockResolvedValueOnce({ user: { email: "asha@example.com" } });

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await screen.findByText("Unable to reach MockMateAI.");
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(await screen.findByText("asha@example.com")).toBeVisible();
    expect(authApi.getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("preserves the user on logout failure and clears it on success", async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      user: { email: "asha@example.com" },
    });
    authApi.logout
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce();

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    expect(await screen.findByText("asha@example.com")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(authApi.logout).toHaveBeenCalledTimes(1));
    expect(screen.getByText("asha@example.com")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await screen.findByText("signed-out");
  });
});

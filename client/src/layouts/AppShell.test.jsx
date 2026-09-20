import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import AppShell from "./AppShell.jsx";

const authContext = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("../hooks/useAuth.js", () => ({
  default: () => ({
    logout: authContext.logout,
    user: { name: "Asha Kumar" },
  }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Route>
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  beforeEach(() => authContext.logout.mockReset());

  it("shows logout progress and a safe retryable failure", async () => {
    let rejectLogout;
    authContext.logout.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectLogout = reject;
        }),
    );
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: /Log out/ }));
    expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();

    rejectLogout(
      new ApiError("NETWORK_ERROR", "Unable to reach MockMateAI.", {
        status: 0,
      }),
    );

    expect(
      await screen.findByText("Unable to reach MockMateAI."),
    ).toBeVisible();
    expect(screen.getAllByText("Dashboard")).toHaveLength(2);
  });

  it("redirects to login after successful logout", async () => {
    authContext.logout.mockResolvedValueOnce();
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: /Log out/ }));

    await waitFor(() => expect(authContext.logout).toHaveBeenCalledOnce());
    expect(await screen.findByText("Login")).toBeVisible();
  });
});

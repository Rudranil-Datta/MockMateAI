import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import LoginPage from "./LoginPage.jsx";

const authContext = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../hooks/useAuth.js", () => ({
  default: () => ({ login: authContext.login }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("shows inline validation before submitting", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(screen.getByText("Enter your password.")).toBeVisible();
    expect(authContext.login).not.toHaveBeenCalled();
  });

  it("preserves fields and shows safe login failure", async () => {
    authContext.login.mockRejectedValueOnce(
      new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect.", {
        status: 401,
      }),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "asha@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secure-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText("Email or password is incorrect."),
    ).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveValue("asha@example.com");
  });

  it("submits normalized credentials and redirects after login", async () => {
    let resolveLogin;
    authContext.login.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  asha@example.com  " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secure-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
    expect(authContext.login).toHaveBeenCalledWith({
      email: "asha@example.com",
      password: "secure-password-123",
    });

    resolveLogin({ id: "user-1" });

    expect(await screen.findByText("Dashboard")).toBeVisible();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import SignupPage from "./SignupPage.jsx";

const authContext = vi.hoisted(() => ({ signup: vi.fn() }));

vi.mock("../hooks/useAuth.js", () => ({
  default: () => ({ signup: authContext.signup }),
}));

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function enterValidSignup() {
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Asha Kumar" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "asha@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secure-password-123" },
  });
}

describe("SignupPage", () => {
  beforeEach(() => authContext.signup.mockReset());

  it("shows inline validation before submitting", () => {
    renderSignup();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter your name.")).toBeVisible();
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(
      screen.getByText("Use a password with at least 12 characters."),
    ).toBeVisible();
    expect(authContext.signup).not.toHaveBeenCalled();
  });

  it("submits normalized fields and redirects on success", async () => {
    authContext.signup.mockResolvedValueOnce({ id: "user-1" });
    renderSignup();
    enterValidSignup();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Dashboard")).toBeVisible();
    expect(authContext.signup).toHaveBeenCalledWith({
      email: "asha@example.com",
      name: "Asha Kumar",
      password: "secure-password-123",
    });
  });

  it("preserves fields and shows safe signup failure", async () => {
    authContext.signup.mockRejectedValueOnce(
      new ApiError("DUPLICATE_EMAIL", "Account already exists.", {
        fields: { email: "Use a different email address." },
        status: 409,
      }),
    );
    renderSignup();
    enterValidSignup();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Account already exists.")).toBeVisible();
    expect(screen.getByText("Use a different email address.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Email/ })).toHaveValue(
      "asha@example.com",
    );
  });
});

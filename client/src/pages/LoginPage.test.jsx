import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import LoginPage from "./LoginPage.jsx";

const authContext = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../hooks/useAuth.js", () => ({
  default: () => ({ login: authContext.login }),
}));

describe("LoginPage", () => {
  it("shows inline validation before submitting", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

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
});

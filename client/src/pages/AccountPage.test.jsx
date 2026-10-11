import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/httpClient.js";
import AccountPage from "./AccountPage.jsx";

const auth = vi.hoisted(() => ({
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  user: {
    email: "asha@example.com",
    id: "68d28d4fe533c5c96697b002",
    name: "Asha Kumar",
    profile: {},
  },
}));

vi.mock("../hooks/useAuth.js", () => ({ default: () => auth }));

describe("AccountPage", () => {
  beforeEach(() => {
    auth.updatePassword.mockReset();
    auth.updateProfile.mockReset();
  });

  it("renders only the signed-in user's account identity", () => {
    render(<AccountPage />);

    expect(
      screen.getByRole("heading", { name: "Your account." }),
    ).toBeVisible();
    expect(screen.getByText("Asha Kumar")).toBeVisible();
    expect(screen.getByText("asha@example.com")).toBeVisible();
    expect(
      screen.getByText(/available only while you are signed in/i),
    ).toBeVisible();
    expect(
      screen.queryByText(/authentication begins in week 2/i),
    ).not.toBeInTheDocument();
  });

  it("saves allow-listed profile fields", async () => {
    auth.updateProfile.mockResolvedValueOnce({
      ...auth.user,
      name: "Asha Updated",
      profile: {
        experienceLevel: "advanced",
        targetRole: "Platform Engineer",
      },
    });
    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Asha Updated" },
    });
    fireEvent.change(screen.getByLabelText("Target role (optional)"), {
      target: { value: "Platform Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Experience level (optional)"), {
      target: { value: "advanced" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(auth.updateProfile).toHaveBeenCalledWith({
        name: "Asha Updated",
        profile: {
          experienceLevel: "advanced",
          targetRole: "Platform Engineer",
        },
      }),
    );
    expect(await screen.findByText("Profile saved.")).toBeVisible();
  });

  it("blocks invalid password confirmation before request", () => {
    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "secure-password-123" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password-456" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different-password-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords do not match.")).toBeVisible();
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it("keeps entered profile values after a safe server field error", async () => {
    auth.updateProfile.mockRejectedValueOnce(
      new ApiError("VALIDATION_ERROR", "Check the highlighted fields.", {
        fields: { targetRole: "Enter a target role of up to 100 characters." },
        status: 400,
      }),
    );
    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText("Target role (optional)"), {
      target: { value: "A role still being edited" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByText("Check the highlighted fields."),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: /^Target role/ })).toHaveValue(
      "A role still being edited",
    );
    expect(auth.updateProfile).toHaveBeenCalledOnce();
  });

  it("updates password and clears credentials after success", async () => {
    auth.updatePassword.mockResolvedValueOnce({ user: auth.user });
    render(<AccountPage />);
    const newPassword = "new-secure-password-456";

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "secure-password-123" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: newPassword },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: newPassword },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(auth.updatePassword).toHaveBeenCalledWith({
        confirmation: newPassword,
        currentPassword: "secure-password-123",
        newPassword,
      }),
    );
    expect(await screen.findByText("Password updated.")).toBeVisible();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("renders independent password visibility controls", () => {
    render(<AccountPage />);
    const [currentToggle, newToggle, confirmationToggle] = screen.getAllByRole(
      "button",
      { name: "Show password" },
    );

    fireEvent.click(currentToggle);
    fireEvent.click(confirmationToggle);

    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "text",
    );
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "type",
      "text",
    );
    expect(newToggle).toBeVisible();
  });
});

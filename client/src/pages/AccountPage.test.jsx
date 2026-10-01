import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountPage from "./AccountPage.jsx";

vi.mock("../hooks/useAuth.js", () => ({
  default: () => ({
    user: {
      email: "asha@example.com",
      id: "68d28d4fe533c5c96697b002",
      name: "Asha Kumar",
      profile: {},
    },
  }),
}));

describe("AccountPage", () => {
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
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, login, logout, signup } from "./authApi.js";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("./httpClient.js", () => ({ apiRequest }));

describe("authApi", () => {
  beforeEach(() => {
    apiRequest.mockClear();
  });

  it("maps signup and login input to documented requests", () => {
    const signupInput = {
      email: "asha@example.com",
      name: "Asha",
      password: "secure-password-123",
    };
    const loginInput = {
      email: "asha@example.com",
      password: "secure-password-123",
    };

    signup(signupInput);
    login(loginInput);

    expect(apiRequest).toHaveBeenNthCalledWith(1, "auth/signup", {
      body: signupInput,
      method: "POST",
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "auth/login", {
      body: loginInput,
      method: "POST",
    });
  });

  it("maps current-user and logout requests", () => {
    getCurrentUser();
    logout();

    expect(apiRequest).toHaveBeenNthCalledWith(1, "auth/me", undefined);
    expect(apiRequest).toHaveBeenNthCalledWith(2, "auth/logout", {
      method: "POST",
    });
  });
});

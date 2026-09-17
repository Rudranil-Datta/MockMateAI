import { useEffect, useMemo, useState } from "react";

import * as authApi from "../api/authApi.js";
import { ApiError } from "../api/httpClient.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      setAuthError("");
      try {
        const response = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(response.user);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          if (isMounted) {
            setUser(null);
          }
        } else if (isMounted) {
          setAuthError(
            error instanceof ApiError
              ? error.message
              : "Unable to restore your session. Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [sessionAttempt]);

  const value = useMemo(
    () => ({
      authError,
      isAuthLoading,
      isAuthenticated: Boolean(user),
      user,
      async login(input) {
        const response = await authApi.login(input);
        setUser(response.user);
        return response.user;
      },
      async logout() {
        await authApi.logout();
        setUser(null);
      },
      async signup(input) {
        const response = await authApi.signup(input);
        setUser(response.user);
        return response.user;
      },
      retrySession() {
        setIsAuthLoading(true);
        setSessionAttempt((attempt) => attempt + 1);
      },
    }),
    [authError, isAuthLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

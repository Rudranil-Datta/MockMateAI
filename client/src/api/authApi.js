import { apiRequest } from "./httpClient.js";

export function signup(input, options) {
  return apiRequest("auth/signup", { ...options, body: input, method: "POST" });
}

export function login(input, options) {
  return apiRequest("auth/login", { ...options, body: input, method: "POST" });
}

export function logout(options) {
  return apiRequest("auth/logout", { ...options, method: "POST" });
}

export function getCurrentUser(options) {
  return apiRequest("auth/me", options);
}

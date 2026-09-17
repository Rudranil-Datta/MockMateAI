import { healthRequest } from "./httpClient.js";

export function getHealth(options) {
  return healthRequest(options);
}

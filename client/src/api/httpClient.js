const defaultApiBaseUrl = "http://localhost:4444/api";

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
}

function parseResponseBody(responseText) {
  if (!responseText) {
    return undefined;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new ApiError(
      "UNEXPECTED_RESPONSE",
      "The server returned an unexpected response. Please try again.",
    );
  }
}

function getErrorFromResponse(status, body) {
  const error = body?.error;
  if (typeof error?.code === "string" && typeof error?.message === "string") {
    return new ApiError(error.code, error.message, {
      fields: error.fields,
      status,
    });
  }

  return new ApiError(
    "REQUEST_FAILED",
    "Request could not be completed. Please try again.",
    { status },
  );
}

function createRequestSignal(signal, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  function abortRequest() {
    controller.abort();
  }

  signal?.addEventListener("abort", abortRequest, { once: true });

  return {
    signal: controller.signal,
    cleanup() {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortRequest);
    },
  };
}

async function requestUrl(url, options = {}) {
  const {
    body,
    credentials = "include",
    fetchImpl = window.fetch,
    headers = {},
    method = "GET",
    signal,
    timeoutMs = 8000,
  } = options;
  const request = createRequestSignal(signal, timeoutMs);
  const hasBody = body !== undefined;

  try {
    const response = await fetchImpl(url, {
      body: hasBody ? JSON.stringify(body) : undefined,
      credentials,
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      method,
      signal: request.signal,
    });
    const responseBody = parseResponseBody(await response.text());

    if (!response.ok) {
      throw getErrorFromResponse(response.status, responseBody);
    }

    return responseBody;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (request.signal.aborted) {
      throw new ApiError(
        "REQUEST_TIMEOUT",
        "Request took too long. Please try again.",
      );
    }

    throw new ApiError(
      "NETWORK_ERROR",
      "Unable to reach MockMateAI. Check your connection and try again.",
    );
  } finally {
    request.cleanup();
  }
}

export class ApiError extends Error {
  constructor(code, message, { fields, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

export function apiRequest(path, options) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return requestUrl(`${baseUrl}/${normalizedPath}`, options);
}

export function healthRequest(options) {
  const healthUrl = new URL("/health", getApiBaseUrl()).toString();
  return requestUrl(healthUrl, options);
}

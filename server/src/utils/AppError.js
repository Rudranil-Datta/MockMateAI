const providerErrorCategories = new Set([
  "provider_authentication",
  "provider_invalid_response",
  "provider_model_not_found",
  "provider_permission",
  "provider_quota",
  "provider_rejected",
  "provider_timeout",
  "provider_unavailable",
  "provider_unknown",
]);

const providerOperations = new Set([
  "adaptive_question",
  "job_target_analysis",
  "project_extraction",
  "question_generation",
  "v1_evaluation",
  "v2_evaluation",
]);
const providerProfiles = new Set(["structured_json_v1"]);
const providerStatusClasses = new Set(["4xx", "5xx", "unknown"]);
const providerSdkSignals = new Set([
  "AbortError",
  "FAILED_PRECONDITION",
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "RESOURCE_EXHAUSTED",
  "TimeoutError",
  "UNAUTHENTICATED",
  "UNAVAILABLE",
  "unknown",
]);

export function isProviderErrorCategory(value) {
  return providerErrorCategories.has(value);
}

export function isSafeProviderDiagnostics(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value).sort();
  const allowedKeys = ["operation", "profile", "sdkSignal", "statusClass"];
  if (
    keys.length !== allowedKeys.length ||
    keys.some((key, index) => key !== allowedKeys[index])
  ) {
    return false;
  }

  return (
    providerOperations.has(value.operation) &&
    providerProfiles.has(value.profile) &&
    providerSdkSignals.has(value.sdkSignal) &&
    providerStatusClasses.has(value.statusClass)
  );
}

export class AppError extends Error {
  constructor(
    code,
    message,
    {
      errorCategory,
      expose = false,
      fields,
      providerDiagnostics,
      status = 500,
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fields = fields;
    this.expose = expose;
    this.status = status;

    if (isProviderErrorCategory(errorCategory)) {
      Object.defineProperty(this, "errorCategory", {
        configurable: false,
        enumerable: false,
        value: errorCategory,
        writable: false,
      });
    }

    if (isSafeProviderDiagnostics(providerDiagnostics)) {
      Object.defineProperty(this, "providerDiagnostics", {
        configurable: false,
        enumerable: false,
        value: providerDiagnostics,
        writable: false,
      });
    }
  }
}

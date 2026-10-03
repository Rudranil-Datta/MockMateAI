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

export function isProviderErrorCategory(value) {
  return providerErrorCategories.has(value);
}

export class AppError extends Error {
  constructor(
    code,
    message,
    { errorCategory, expose = false, fields, status = 500 } = {},
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
  }
}

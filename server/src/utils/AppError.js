export class AppError extends Error {
  constructor(code, message, { expose = false, fields, status = 500 } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fields = fields;
    this.expose = expose;
    this.status = status;
  }
}

/**
 * Operational error with an HTTP status and a stable machine-readable code.
 * The frontend translates `code`; `message` is an English fallback for API users.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details) this.details = details;
  }
}

export const notFound = (code, message) => new AppError(404, code, message);
export const conflict = (code, message) => new AppError(409, code, message);
export const forbidden = (code, message) => new AppError(403, code, message);
export const badRequest = (code, message) => new AppError(400, code, message);

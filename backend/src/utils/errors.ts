/**
 * Application error type.
 * Controllers throw ApiError; the central error handler turns it into a
 * consistent JSON response without leaking stack traces to clients.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static validation(message = "The submitted data is invalid.", details?: unknown) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }
  static unauthorized(message = "You must be signed in to continue.") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "The requested resource was not found.") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }
  static tooMany(message = "Too many requests. Please wait a moment and try again.") {
    return new ApiError(429, "RATE_LIMITED", message);
  }
  static internal(message = "Something went wrong on our side. Please try again.") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

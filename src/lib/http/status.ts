import type { ApiErrorCode } from "../../types";

/**
 * Maps an internal ApiErrorCode to an HTTP status number.
 * Extend as new ApiErrorCode values require distinct statuses.
 */
export function statusForErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN_ROLE":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    case "ROLE_INVALID":
      return 400;
    case "LAST_ADMIN_REMOVAL":
      return 409;
    case "CONFLICT":
      return 409;
    case "RATE_LIMIT_EXCEEDED":
      return 429;
    default:
      return 500;
  }
}

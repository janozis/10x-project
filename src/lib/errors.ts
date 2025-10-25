import type { ApiError, ApiErrorCode } from "../types";

type ErrorDetails = Record<string, unknown>;

function make(code: ApiErrorCode, message: string, details?: ErrorDetails): ApiError {
  return { error: { code, message, details } };
}

export const errors = {
  validation: (fieldErrors: Record<string, unknown>) => make("VALIDATION_ERROR", "Invalid payload", fieldErrors),
  dateRangeInvalid: () => make("DATE_RANGE_INVALID", "end_date must be >= start_date"),
  groupLimitReached: (current: number, limit: number) =>
    make("GROUP_LIMIT_REACHED", "Group limit reached", { current, limit }),
  unauthorized: () => make("UNAUTHORIZED", "Authentication required"),
  internal: (message = "Internal server error") => make("INTERNAL_ERROR", message),
};

export type ErrorFactories = typeof errors;

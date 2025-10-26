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
  // New factories for group membership/role flows
  roleInvalid: () => make("ROLE_INVALID", "Role must be one of admin|editor|member"),
  forbiddenRole: () => make("FORBIDDEN_ROLE", "Insufficient role to perform this action"),
  lastAdminRemoval: () => make("LAST_ADMIN_REMOVAL", "Cannot remove the last admin from the group"),
  notFound: (entity = "Resource") => make("NOT_FOUND", `${entity} not found`),
  // Activity editors domain
  userNotInGroup: (details?: ErrorDetails) => make("USER_NOT_IN_GROUP", "User is not a member of the group", details),
  alreadyAssigned: (details?: ErrorDetails) => make("ALREADY_ASSIGNED", "Editor already assigned", details),
  activityNotFound: () => make("ACTIVITY_NOT_FOUND", "Activity not found"),
  badRequest: (message = "Bad request", details?: ErrorDetails) => make("BAD_REQUEST", message, details),
  conflict: (message = "Conflict", details?: ErrorDetails) => make("CONFLICT", message, details),
};

export type ErrorFactories = typeof errors;

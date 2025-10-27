import { z } from "zod";

/**
 * Validation schema for dashboard query parameters.
 * Validates optional recent_limit parameter (1-50, default 10).
 */
export const dashboardQuerySchema = z.object({
  recent_limit: z.coerce
    .number()
    .int()
    .min(1, "recent_limit must be at least 1")
    .max(50, "recent_limit must be at most 50")
    .optional()
    .default(10),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;

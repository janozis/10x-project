import { z } from "zod";

// Shared helpers
const nonEmptyTrimmed = (name: string, max: number) =>
  z.string().trim().min(1, `${name} required`).max(max, `${name} too long`);

// Range: logical activity duration from 5 minutes up to 24h (1440 minutes)
const durationMinutesSchema = z
  .number({ invalid_type_error: "duration_minutes must be a number" })
  .int("duration_minutes must be an integer")
  .min(5, "duration_minutes min 5")
  .max(1440, "duration_minutes max 1440");

// CREATE schema: all fields required per implementation plan
export const activityCreateSchema = z.object({
  title: nonEmptyTrimmed("title", 200),
  objective: nonEmptyTrimmed("objective", 2000),
  tasks: nonEmptyTrimmed("tasks", 4000),
  duration_minutes: durationMinutesSchema,
  location: nonEmptyTrimmed("location", 500),
  materials: nonEmptyTrimmed("materials", 2000),
  responsible: nonEmptyTrimmed("responsible", 200),
  knowledge_scope: nonEmptyTrimmed("knowledge_scope", 1000),
  participants: nonEmptyTrimmed("participants", 2000),
  flow: nonEmptyTrimmed("flow", 8000),
  summary: nonEmptyTrimmed("summary", 4000),
});

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;

// UPDATE schema: partial; allow subset of fields
export const activityUpdateSchema = activityCreateSchema.partial().extend({
  status: z.enum(["draft", "review", "ready", "archived"]).optional(),
});

export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

// List filters (query params) schema
export const activityListQuerySchema = z.object({
  status: z.enum(["draft", "review", "ready", "archived"]).optional(),
  assigned: z.literal("me").optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  cursor: z.string().optional(),
});

export type ActivityListQueryInput = z.infer<typeof activityListQuerySchema>;

// Helper to map Zod errors into details (flat path->message) if needed elsewhere
export function zodErrorToDetails(err: z.ZodError) {
  return err.errors.reduce<Record<string, string>>((acc, e) => {
    const path = e.path.join(".") || "_";
    acc[path] = e.message;
    return acc;
  }, {});
}

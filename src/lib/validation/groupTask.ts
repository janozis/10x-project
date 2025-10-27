import { z } from "zod";

// Status enumeration for group tasks
export const GROUP_TASK_STATUS_ENUM = ["pending", "in_progress", "done", "canceled"] as const;

// Shared validators
const dueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format (expected YYYY-MM-DD)" });

export const groupTaskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200, "Title max length 200"),
  description: z.string().trim().min(1, "Description required").max(4000, "Description max length 4000"),
  due_date: dueDateSchema.optional().nullable(),
  activity_id: z.string().uuid().optional().nullable(),
});

export const groupTaskUpdateSchema = z
  .object({
    title: z.string().trim().min(1, "Title required").max(200, "Title max length 200").optional(),
    description: z.string().trim().min(1, "Description required").max(4000, "Description max length 4000").optional(),
    due_date: dueDateSchema.optional().nullable(),
    status: z.enum(GROUP_TASK_STATUS_ENUM).optional(),
    activity_id: z.string().uuid().optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field required",
  });

export type GroupTaskCreateInput = z.infer<typeof groupTaskCreateSchema>;
export type GroupTaskUpdateInput = z.infer<typeof groupTaskUpdateSchema>;

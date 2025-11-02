import { z } from "zod";

// Zod schema for creating a group. Mirrors GroupCreateCommand with optional max_members to allow DB default.
// Business rules enforced:
// - Non-empty trimmed strings for textual fields
// - Length limits to prevent excessively large payloads (adjustable later)
// - start_date & end_date must be valid YYYY-MM-DD and end_date >= start_date
// - max_members optional; when provided must be within 1..500
export const groupCreateSchema = z
  .object({
    name: z.string().trim().min(1, "name required").max(200, "name too long"),
    description: z.string().trim().min(1, "description required").max(2000, "description too long"),
    lore_theme: z.string().trim().min(1, "lore_theme required").max(200, "lore_theme too long"),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    max_members: z.number().int().min(1).max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.end_date < val.start_date) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "end_date must be >= start_date",
      });
    }
  });

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;

// Zod schema for updating a group (PATCH). All fields optional, same constraints as create.
export const groupUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    lore_theme: z.string().trim().min(1).max(200).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    max_members: z.number().int().min(1).max(500).optional(),
    status: z.enum(["planning", "active", "archived"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.start_date && val.end_date && val.end_date < val.start_date) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "end_date must be >= start_date",
      });
    }
  });

export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>;

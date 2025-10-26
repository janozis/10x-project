import { z } from "zod";

// Regex for strict YYYY-MM-DD format (no timezone). We rely on DB/date correctness beyond format.
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Max theme length constraint (business assumption; adjustable later)
const MAX_THEME_LEN = 500;

// CREATE schema
export const campDayCreateSchema = z
  .object({
    day_number: z.number().int().min(1, "day_number must be >=1").max(30, "day_number must be <=30"),
    date: z.string().regex(DATE_REGEX, "date must be YYYY-MM-DD"),
    theme: z.string().trim().min(1, "theme cannot be empty").max(MAX_THEME_LEN, "theme too long").nullable().optional(),
  })
  .strict();

export type CampDayCreateInput = z.infer<typeof campDayCreateSchema>;

// UPDATE schema (partial)
export const campDayUpdateSchema = z
  .object({
    date: z.string().regex(DATE_REGEX, "date must be YYYY-MM-DD").optional(),
    theme: z
      .union([z.string().trim().min(1, "theme cannot be empty").max(MAX_THEME_LEN, "theme too long"), z.null()])
      .optional(),
  })
  .strict();

export type CampDayUpdateInput = z.infer<typeof campDayUpdateSchema>;

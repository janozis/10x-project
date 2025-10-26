import { z } from "zod";

// Strict HH:MM 24h format; we additionally perform semantic checks (00-23 / 00-59) in service if needed.
const TIME_REGEX = /^\d{2}:\d{2}$/;

export const activityScheduleCreateSchema = z
  .object({
    activity_id: z.string().uuid("activity_id must be a valid UUID"),
    start_time: z.string().regex(TIME_REGEX, "start_time must be HH:MM"),
    end_time: z.string().regex(TIME_REGEX, "end_time must be HH:MM"),
    order_in_day: z.number().int().min(1, "order_in_day must be >=1"),
  })
  .strict();

export type ActivityScheduleCreateInput = z.infer<typeof activityScheduleCreateSchema>;

export const activityScheduleUpdateSchema = z
  .object({
    start_time: z.string().regex(TIME_REGEX, "start_time must be HH:MM").optional(),
    end_time: z.string().regex(TIME_REGEX, "end_time must be HH:MM").optional(),
    order_in_day: z.number().int().min(1, "order_in_day must be >=1").optional(),
  })
  .strict();

export type ActivityScheduleUpdateInput = z.infer<typeof activityScheduleUpdateSchema>;

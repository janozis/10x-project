import { z } from "zod";

/**
 * Validation schema for assigning an editor to an activity.
 * Body shape: { user_id: UUID }
 */
export const assignEditorSchema = z.object({
  user_id: z.string().uuid(),
});

export type AssignEditorInput = z.infer<typeof assignEditorSchema>;

/** Simple UUID validation helper for path params where using zod directly is overkill. */
export function isUuid(value: string | undefined | null): value is string {
  if (!value) return false;
  // Basic RFC4122 pattern (accepts versions 1-5)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function validateUuid(id: string, field: string) {
  const res = uuidSchema.safeParse(id);
  if (!res.success) {
    return { valid: false, error: { [field]: "Invalid UUID" } };
  }
  return { valid: true };
}

// POST body is empty object semantic; if client sends anything else treat as validation error.
export function validateEmptyBody(body: unknown) {
  if (body == null) return { valid: true };
  if (typeof body === "object" && !Array.isArray(body)) {
    const keys = Object.keys(body as Record<string, unknown>);
    if (keys.length === 0) return { valid: true };
  }
  return { valid: false, error: { body: "Body must be an empty object" } };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =====================
// Cursor Helpers for Activities pagination
// Cursor format (base64): `${created_at}|${id}`
// created_at is ISO timestamp; id is UUID. We base64 encode to keep opaque.
// =====================

/** Build an opaque cursor from activity row fields */
export function encodeActivityCursor(created_at: string, id: string): string {
  return Buffer.from(`${created_at}|${id}`, "utf-8").toString("base64");
}

/** Parse an opaque cursor; returns tuple or null if invalid */
export function parseActivityCursor(cursor: string): { created_at: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [created_at, id] = decoded.split("|");
    if (!created_at || !id) return null;
    // Basic validation: ISO timestamp rough check & UUID v4 pattern (simplified)
    if (!/^\d{4}-\d{2}-\d{2}T/.test(created_at)) return null;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}

/** Build next cursor from last item of a page */
export function nextActivityCursorFromPage<T extends { created_at: string; id: string }>(
  rows: T[]
): string | undefined {
  if (!rows.length) return undefined;
  const last = rows[rows.length - 1];
  return encodeActivityCursor(last.created_at, last.id);
}

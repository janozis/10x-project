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

// =====================
// Cursor Helpers for Group Tasks pagination
// Reuse same opaque format as activities for consistency: base64("created_at|id")
// =====================

export function encodeGroupTaskCursor(created_at: string, id: string): string {
  return Buffer.from(`${created_at}|${id}`, "utf-8").toString("base64");
}

export function parseGroupTaskCursor(cursor: string): { created_at: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [created_at, id] = decoded.split("|");
    if (!created_at || !id) return null;
    if (!/^\d{4}-\d{2}-\d{2}T/.test(created_at)) return null;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}

export function nextGroupTaskCursorFromPage<T extends { created_at: string; id: string }>(
  rows: T[]
): string | undefined {
  if (!rows.length) return undefined;
  const last = rows[rows.length - 1];
  return encodeGroupTaskCursor(last.created_at, last.id);
}

// =====================
// Cursor Helpers for Groups pagination
// Format: base64("created_at|id") same as activities/tasks
// =====================

export function encodeGroupCursor(created_at: string, id: string): string {
  return Buffer.from(`${created_at}|${id}`, "utf-8").toString("base64");
}

export function parseGroupCursor(cursor: string): { created_at: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [created_at, id] = decoded.split("|");
    if (!created_at || !id) return null;
    if (!/^\d{4}-\d{2}-\d{2}T/.test(created_at)) return null;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}

export function nextGroupCursorFromPage<T extends { created_at: string; id: string }>(rows: T[]): string | undefined {
  if (!rows.length) return undefined;
  const last = rows[rows.length - 1];
  return encodeGroupCursor(last.created_at, last.id);
}

// =====================
// HTTP helpers
// =====================

/**
 * Parse Retry-After header value and return milliseconds to wait from now.
 * Supports a delta-seconds value or an HTTP-date.
 */
export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds)) return null;
    return Math.max(0, seconds * 1000);
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : 0;
}

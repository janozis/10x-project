/**
 * Invite Code Validation Utilities
 * - Allowed chars exclude visually ambiguous: I, O, l, 0
 * - Code length: exactly 8
 * - Normalization: always UPPERCASE
 */

export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Za-km-z1-9]{8}$/;
export const INVITE_CODE_ALLOWED_CHAR = /[A-HJ-NP-Za-km-z1-9]/;

/**
 * Sanitize user input to a canonical invite code substring (max 8, UPPERCASE, allowed set only)
 */
export function sanitizeInviteCodeInput(input: string): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) {
    if (INVITE_CODE_ALLOWED_CHAR.test(ch)) {
      out += ch.toUpperCase();
      if (out.length === 8) break;
    }
  }
  return out;
}

/** True iff the provided code is exactly 8 characters and matches the allowed set */
export function isValidInviteCode(code: string): boolean {
  return INVITE_CODE_PATTERN.test(code);
}

/**
 * Format a code for display with a simple 4+4 grouping mask: "ABCD EFGH"
 */
export function formatInviteCodeMasked(raw: string): string {
  const s = sanitizeInviteCodeInput(raw);
  if (s.length <= 4) return s;
  return `${s.slice(0, 4)} ${s.slice(4)}`;
}

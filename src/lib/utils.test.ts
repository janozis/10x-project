import { describe, it, expect } from "vitest";
import { cn, encodeActivityCursor, parseActivityCursor, nextActivityCursorFromPage, parseRetryAfter } from "./utils";

describe("utils", () => {
  describe("cn - className utility", () => {
    it("should merge multiple class names", () => {
      const result = cn("text-red-500", "bg-blue-500");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toContain("base-class");
      expect(result).toContain("active-class");
    });

    it("should handle undefined and null values", () => {
      const result = cn("base-class", undefined, null, "another-class");
      expect(result).toContain("base-class");
      expect(result).toContain("another-class");
    });

    it("should resolve Tailwind conflicts correctly", () => {
      const result = cn("px-2 py-1", "p-4");
      // twMerge should resolve the conflict
      expect(result).toBe("p-4");
    });
  });

  describe("Activity Cursor helpers", () => {
    const mockCreatedAt = "2024-01-15T10:30:00.000Z";
    const mockId = "123e4567-e89b-12d3-a456-426614174000";

    describe("encodeActivityCursor", () => {
      it("should encode cursor correctly", () => {
        const cursor = encodeActivityCursor(mockCreatedAt, mockId);
        expect(cursor).toBeTruthy();
        expect(typeof cursor).toBe("string");

        // Should be base64 encoded
        const decoded = Buffer.from(cursor, "base64").toString("utf-8");
        expect(decoded).toBe(`${mockCreatedAt}|${mockId}`);
      });
    });

    describe("parseActivityCursor", () => {
      it("should parse valid cursor", () => {
        const cursor = encodeActivityCursor(mockCreatedAt, mockId);
        const result = parseActivityCursor(cursor);

        expect(result).not.toBeNull();
        expect(result?.created_at).toBe(mockCreatedAt);
        expect(result?.id).toBe(mockId);
      });

      it("should return null for invalid base64", () => {
        const result = parseActivityCursor("invalid-cursor!!!");
        expect(result).toBeNull();
      });

      it("should return null for cursor without pipe separator", () => {
        const invalidCursor = Buffer.from("no-pipe-here", "utf-8").toString("base64");
        const result = parseActivityCursor(invalidCursor);
        expect(result).toBeNull();
      });

      it("should return null for invalid timestamp format", () => {
        const invalidCursor = Buffer.from("invalid-date|123e4567-e89b-12d3-a456-426614174000", "utf-8").toString(
          "base64"
        );
        const result = parseActivityCursor(invalidCursor);
        expect(result).toBeNull();
      });

      it("should return null for invalid UUID format", () => {
        const invalidCursor = Buffer.from("2024-01-15T10:30:00.000Z|not-a-uuid", "utf-8").toString("base64");
        const result = parseActivityCursor(invalidCursor);
        expect(result).toBeNull();
      });
    });

    describe("nextActivityCursorFromPage", () => {
      it("should return cursor from last item in page", () => {
        const rows = [
          { created_at: "2024-01-15T10:00:00.000Z", id: "123e4567-e89b-12d3-a456-426614174001", title: "Activity 1" },
          { created_at: mockCreatedAt, id: mockId, title: "Activity 2" },
        ];

        const cursor = nextActivityCursorFromPage(rows);
        expect(cursor).toBeTruthy();

        if (cursor) {
          const parsed = parseActivityCursor(cursor);
          expect(parsed?.created_at).toBe(mockCreatedAt);
          expect(parsed?.id).toBe(mockId);
        }
      });

      it("should return undefined for empty array", () => {
        const cursor = nextActivityCursorFromPage([]);
        expect(cursor).toBeUndefined();
      });
    });
  });

  describe("parseRetryAfter", () => {
    it("should parse delta-seconds format", () => {
      const result = parseRetryAfter("120");
      expect(result).toBe(120000); // 120 seconds = 120000 ms
    });

    it("should parse zero seconds", () => {
      const result = parseRetryAfter("0");
      expect(result).toBe(0);
    });

    it("should return null for null input", () => {
      const result = parseRetryAfter(null);
      expect(result).toBeNull();
    });

    it("should return null for invalid format", () => {
      const result = parseRetryAfter("invalid");
      expect(result).toBeNull();
    });

    it("should parse HTTP date format", () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute in future
      const result = parseRetryAfter(futureDate.toUTCString());

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for past dates", () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute in past
      const result = parseRetryAfter(pastDate.toUTCString());
      expect(result).toBe(0);
    });

    it("should handle whitespace in value", () => {
      const result = parseRetryAfter("  120  ");
      expect(result).toBe(120000);
    });
  });
});

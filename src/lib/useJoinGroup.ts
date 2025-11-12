import { useCallback, useState } from "react";
import type { ApiResponse, GroupDTO, UUID, ApiErrorCode } from "@/types";

interface JoinSuccess {
  ok: true;
  groupId: UUID;
}

interface JoinFailure {
  ok: false;
  code: ApiErrorCode;
  message: string;
}

export function useJoinGroup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorCode | undefined>(undefined);

  const resetError = useCallback(() => setError(undefined), []);

  const joinByCode = useCallback(async (code: string): Promise<JoinSuccess | JoinFailure> => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        const fallback: JoinFailure = {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Unexpected response",
        } as JoinFailure;
        setError(fallback.code);
        return fallback;
      }

      const payload = (await res.json()) as ApiResponse<{ group_id: UUID } | GroupDTO>;

      if ("data" in payload) {
        const data = payload.data as { group_id?: UUID } | GroupDTO;
        const groupId: UUID | undefined = (data as any).group_id || (data as GroupDTO).id;
        if (groupId) {
          return { ok: true, groupId } as JoinSuccess;
        }
        const fail: JoinFailure = { ok: false, code: "INTERNAL_ERROR", message: "Missing group id" } as JoinFailure;
        setError(fail.code);
        return fail;
      }

      if ("error" in payload && payload.error) {
        const code = mapApiErrorToJoinCode(payload.error.code);
        const fail: JoinFailure = { ok: false, code, message: payload.error.message } as JoinFailure;
        setError(fail.code);
        return fail;
      }

      const unknown: JoinFailure = { ok: false, code: "INTERNAL_ERROR", message: "Unknown error" } as JoinFailure;
      setError(unknown.code);
      return unknown;
    } catch {
      const networkFail: JoinFailure = { ok: false, code: "INTERNAL_ERROR", message: "Network error" } as JoinFailure;
      setError(networkFail.code);
      return networkFail;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { joinByCode, isSubmitting, error, resetError };
}

function mapApiErrorToJoinCode(code: ApiErrorCode): ApiErrorCode {
  // We pass-through known codes; unknowns become INTERNAL_ERROR at usage site
  switch (code) {
    case "INVITE_INVALID":
    case "INVITE_EXPIRED":
    case "INVITE_MAXED":
    case "UNAUTHORIZED":
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
    case "INTERNAL_ERROR":
      return code;
    default:
      return "INTERNAL_ERROR";
  }
}

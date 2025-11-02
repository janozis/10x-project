import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";
import { deleteCampDay } from "@/lib/camp-days/api.client";
import type { ApiError, ApiErrorCode, ApiResponse, UUID } from "@/types";
import { toast } from "sonner";

export interface DeleteCampDayButtonProps {
  campDayId: UUID;
  groupId: UUID;
  canDelete: boolean;
  mode: "list" | "details";
  onDeleted?: () => Promise<void> | void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  children?: React.ReactNode;
}

export function DeleteCampDayButton({
  campDayId,
  groupId,
  canDelete,
  mode,
  onDeleted,
  className,
  size = "sm",
  label,
  children,
}: DeleteCampDayButtonProps): JSX.Element | null {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const buttonLabel = label ?? "Usuń dzień";

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[DeleteCampDayButton] canDelete:", canDelete);
    }
  }, [canDelete]);

  const handleMissingCampDay = React.useCallback(async () => {
    toast.error("Dzień nie istnieje lub został już usunięty.");
    if (mode === "list") {
      await onDeleted?.();
    } else {
      window.location.href = `/groups/${groupId}/camp-days`;
    }
  }, [groupId, mode, onDeleted]);

  const handleApiError = React.useCallback(
    async (code?: ApiErrorCode, status?: number) => {
      switch (code ?? mapStatusToCode(status)) {
        case "UNAUTHORIZED":
          toast.error("Musisz być zalogowany, aby wykonać tę akcję.");
          return;
        case "FORBIDDEN_ROLE":
          toast.error("Brak uprawnień do usunięcia dnia.");
          return;
        case "NOT_FOUND":
          await handleMissingCampDay();
          setOpen(false);
          return;
        default:
          toast.error("Nie udało się usunąć dnia. Spróbuj ponownie.");
      }
    },
    [handleMissingCampDay]
  );

  const onConfirm = React.useCallback(async () => {
    if (loading || !canDelete) {
      return;
    }
    setLoading(true);
    try {
      const response = await deleteCampDay(campDayId);
      if (isApiError(response)) {
        await handleApiError(response.error.code, undefined);
        return;
      }

      toast.success("Usunięto dzień.");
      setOpen(false);

      if (mode === "list") {
        await onDeleted?.();
      } else {
        window.location.href = `/groups/${groupId}/camp-days`;
      }
    } catch (error: unknown) {
      const { status, code } = extractErrorDetails(error);
      await handleApiError(code, status);
    } finally {
      setLoading(false);
    }
  }, [campDayId, canDelete, groupId, handleApiError, loading, mode, onDeleted]);

  if (!canDelete) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={size}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("[DeleteCampDayButton] Clicked, canDelete:", canDelete);
          if (canDelete) {
            setOpen(true);
          }
        }}
        aria-label={buttonLabel}
        title={buttonLabel}
        disabled={!canDelete}
      >
        {children ?? buttonLabel}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!loading) {
            setOpen(next);
          }
        }}
        title="Usuń dzień obozu"
        description="Usunięcie spowoduje skasowanie wszystkich slotów tego dnia. Tej operacji nie można cofnąć."
        confirmText="Usuń"
        variant="destructive"
        loading={loading}
        onConfirm={() => {
          void onConfirm();
        }}
      />
    </>
  );
}

function isApiError(response: ApiResponse<unknown>): response is ApiError {
  return "error" in response;
}

function extractErrorDetails(error: unknown): { status?: number; code?: ApiErrorCode } {
  if (typeof error === "object" && error !== null) {
    const status = typeof (error as any).status === "number" ? (error as any).status : undefined;
    const code = (error as any).body?.error?.code as ApiErrorCode | undefined;
    return { status, code };
  }
  return {};
}

function mapStatusToCode(status?: number): ApiErrorCode | undefined {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN_ROLE";
    case 404:
      return "NOT_FOUND";
    default:
      return undefined;
  }
}

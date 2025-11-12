import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeleteCampDayDialogProps {
  open: boolean;
  name?: string;
  loading: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteCampDayDialog({
  open,
  name,
  loading,
  error,
  onOpenChange,
  onConfirm,
}: DeleteCampDayDialogProps): React.ReactElement {
  const description = name
    ? `Czy na pewno chcesz usunąć dzień „${name}”? Tej operacji nie można cofnąć.`
    : "Czy na pewno chcesz usunąć ten dzień? Tej operacji nie można cofnąć.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog" aria-live="assertive">
        <DialogHeader>
          <DialogTitle>Usuń dzień obozu</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Usuń dzień
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

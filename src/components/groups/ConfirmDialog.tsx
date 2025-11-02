import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = "Potwierdź", variant = "default", onConfirm, loading }: ConfirmDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={!!loading}>Anuluj</Button>
          <Button type="button" variant={variant} onClick={() => { void onConfirm(); }} disabled={!!loading} aria-disabled={!!loading}>
            {loading ? "Przetwarzanie…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



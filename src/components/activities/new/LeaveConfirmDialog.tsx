import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface LeaveConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LeaveConfirmDialog({ open, onCancel, onConfirm }: LeaveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opuścić stronę?</DialogTitle>
          <DialogDescription>
            Masz niezapisane zmiany. Jeśli opuścisz stronę, mogą zostać utracone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Opuść
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



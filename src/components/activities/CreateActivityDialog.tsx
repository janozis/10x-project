import * as React from "react";
import type { UUID } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import NewActivityStepper from "@/components/activities/new/NewActivityStepper";

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: UUID;
  onSuccess?: () => void;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  groupId,
  onSuccess,
}: CreateActivityDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowa aktywność</DialogTitle>
          <DialogDescription>Utwórz nową aktywność dla grupy. Uzupełnij wszystkie pola formularza.</DialogDescription>
        </DialogHeader>
        <NewActivityStepper groupId={groupId} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}

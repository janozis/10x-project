import * as React from "react";

export type ConflictResolution = "takeServer" | "overwriteServer" | "manualMerge";

export interface ConflictInfo<T = unknown> {
  server: T & { updated_at?: string };
  local: T;
  fieldsInConflict: string[];
}

export function useConflictDetection<T>() {
  const [conflict, setConflict] = React.useState<ConflictInfo<T> | null>(null);
  const [open, setOpen] = React.useState(false);

  const reportConflict = React.useCallback((info: ConflictInfo<T>) => {
    setConflict(info);
    setOpen(true);
  }, []);

  const reset = React.useCallback(() => {
    setOpen(false);
    setConflict(null);
  }, []);

  return { conflict, open, setOpen, reportConflict, reset } as const;
}



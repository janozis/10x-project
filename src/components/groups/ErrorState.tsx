import * as React from "react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  onRetry: () => void;
  message?: string;
  children?: React.ReactNode;
}

export function ErrorState({ onRetry, message, children }: ErrorStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <div className="text-destructive">{message ?? "Wystąpił błąd podczas ładowania danych."}</div>
      {children ? <div className="text-xs text-muted-foreground">{children}</div> : null}
      <Button size="sm" variant="destructive" onClick={onRetry}>Spróbuj ponownie</Button>
    </div>
  );
}



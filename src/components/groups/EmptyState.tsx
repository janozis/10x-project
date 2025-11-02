import * as React from "react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  variant?: "default" | "deleted";
}

const EmptyStateComponent = ({ onOpenCreate, onOpenJoin, variant = "default" }: EmptyStateProps): JSX.Element => {
  const isDeleted = variant === "deleted";
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-background p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="size-6" aria-hidden>
          <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4S8 5.79 8 8s1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"/>
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-medium">{isDeleted ? "Brak usuniętych grup" : "Brak grup"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDeleted
            ? "Nie znaleziono ostatnio usuniętych grup. Funkcja wymaga wsparcia backendu."
            : "Utwórz nową grupę lub dołącz do istniejącej za pomocą kodu zaproszenia."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onOpenJoin}>Dołącz do grupy</Button>
        <Button onClick={onOpenCreate}>Utwórz grupę</Button>
      </div>
    </div>
  );
}

export const EmptyState = React.memo(EmptyStateComponent);



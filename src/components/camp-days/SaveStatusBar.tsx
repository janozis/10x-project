import * as React from "react";

export interface SaveStatusBarProps {
  state: "idle" | "saving" | "saved" | "error";
  message?: string;
}

const SaveStatusBarComponent = ({ state, message }: SaveStatusBarProps): JSX.Element | null => {
  if (state === "idle") return null;
  if (state === "saving") {
    return <div className="text-sm text-muted-foreground" role="status" aria-live="polite">Zapisywanie…</div>;
  }
  if (state === "saved") {
    return <div className="text-sm text-muted-foreground" role="status" aria-live="polite">Zapisano</div>;
  }
  return (
    <div className="text-sm text-destructive" role="status" aria-live="assertive">
      {message || "Błąd zapisu. Spróbuj ponownie."}
    </div>
  );
};

export const SaveStatusBar = React.memo(SaveStatusBarComponent);



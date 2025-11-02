import * as React from "react";

interface DirtyPromptProps {
  active: boolean;
}

export function DirtyPrompt({ active }: DirtyPromptProps): JSX.Element | null {
  React.useEffect(() => {
    if (!active) return;
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Masz niezapisane zmiany";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [active]);
  return null;
}



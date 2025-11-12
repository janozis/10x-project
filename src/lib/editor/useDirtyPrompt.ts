import * as React from "react";

export function useDirtyPrompt(active: boolean): void {
  React.useEffect(() => {
    if (!active) return;
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Masz niezapisane zmiany";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [active]);
}

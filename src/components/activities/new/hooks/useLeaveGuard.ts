import * as React from "react";

export function useLeaveGuard(shouldGuard: boolean) {
  React.useEffect(() => {
    if (!shouldGuard) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Masz niezapisane zmiany.";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [shouldGuard]);
}



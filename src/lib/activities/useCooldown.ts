import * as React from "react";

export function useCooldown(startTimestamp?: string, windowSec = 300) {
  const compute = React.useCallback(() => {
    if (!startTimestamp) return 0;
    const start = new Date(startTimestamp).getTime();
    if (Number.isNaN(start)) return 0;
    const end = start + windowSec * 1000;
    const now = Date.now();
    const diff = Math.max(0, Math.ceil((end - now) / 1000));
    return diff;
  }, [startTimestamp, windowSec]);

  const [remainingSec, setRemainingSec] = React.useState<number>(compute);

  React.useEffect(() => {
    setRemainingSec(compute());
  }, [compute]);

  React.useEffect(() => {
    if (remainingSec <= 0) return;
    const id = setInterval(() => setRemainingSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [remainingSec]);

  return remainingSec;
}

import * as React from "react";

export interface CountdownProps {
  seconds: number;
  onTick?: (remaining: number) => void;
}

export function Countdown({ seconds, onTick }: CountdownProps) {
  const [remaining, setRemaining] = React.useState(Math.max(0, Math.floor(seconds)));

  React.useEffect(() => {
    setRemaining(Math.max(0, Math.floor(seconds)));
  }, [seconds]);

  React.useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((s) => {
        const next = Math.max(0, s - 1);
        if (onTick) onTick(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onTick]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <span aria-live="polite" className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}



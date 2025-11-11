import * as React from "react";
import type { TimeHHMM } from "@/types";
import { isValidTimeString } from "@/lib/camp-days/types";
import { Input } from "@/components/ui/input";

export interface TimeRangeEditorProps {
  start: TimeHHMM;
  end: TimeHHMM;
  disabled?: boolean;
  onChange: (next: { start: TimeHHMM; end: TimeHHMM }) => void;
}

export const TimeRangeEditor = ({ start, end, disabled, onChange }: TimeRangeEditorProps): JSX.Element => {
  const [localStart, setLocalStart] = React.useState<string>(start);
  const [localEnd, setLocalEnd] = React.useState<string>(end);

  React.useEffect(() => setLocalStart(start), [start]);
  React.useEffect(() => setLocalEnd(end), [end]);

  const startValid = isValidTimeString(localStart);
  const endValid = isValidTimeString(localEnd);
  const rangeValid = startValid && endValid && localEnd > localStart;

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Input
        type="time"
        value={localStart}
        onChange={(e) => {
          const v = e.currentTarget.value as TimeHHMM;
          setLocalStart(v);
          onChange({ start: v, end: localEnd as TimeHHMM });
        }}
        disabled={disabled}
        aria-invalid={!startValid}
        className={!startValid ? "border-destructive" : undefined}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="time"
        value={localEnd}
        onChange={(e) => {
          const v = e.currentTarget.value as TimeHHMM;
          setLocalEnd(v);
          onChange({ start: localStart as TimeHHMM, end: v });
        }}
        disabled={disabled}
        aria-invalid={!endValid || !rangeValid}
        className={!endValid || !rangeValid ? "border-destructive" : undefined}
      />
    </div>
  );
};

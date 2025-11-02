import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConflictResolution = "takeServer" | "overwriteServer" | "manualMerge";

interface ConflictInfo<T = Record<string, unknown>> {
  server: T & { updated_at?: string };
  local: T;
  fieldsInConflict: Array<keyof T & string>;
}

interface ConflictDiffModalProps<T = Record<string, unknown>> {
  open: boolean;
  conflict: ConflictInfo<T> | null;
  onOpenChange: (open: boolean) => void;
  onResolve: (resolution: ConflictResolution, selectedServerKeys?: string[]) => void;
}

export function ConflictDiffModal<T = Record<string, unknown>>({ open, conflict, onOpenChange, onResolve }: ConflictDiffModalProps<T>): JSX.Element {
  const fields = (conflict?.fieldsInConflict as string[]) || [];
  const [selected, setSelected] = React.useState<Set<string>>(new Set(fields));

  React.useEffect(() => {
    setSelected(new Set(fields));
  }, [open, conflict]);

  function toggle(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wykryto konflikt zapisu</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Na serwerze istnieje nowsza wersja aktywności. Wybierz sposób rozwiązania konfliktu.</p>
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">Zaznacz pola do pobrania z serwera</div>
            <div className="flex items-center gap-2">
              <button type="button" className="underline hover:text-foreground" onClick={() => setSelected(new Set(fields))}>Zaznacz wszystkie</button>
              <button type="button" className="underline hover:text-foreground" onClick={() => setSelected(new Set())}>Wyczyść</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="font-medium">Wartości lokalne</div>
              <ul className="mt-1 space-y-1">
                {fields.map((k) => (
                  <li key={`l-${k}`} className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{k}</span>
                      <label className="inline-flex items-center gap-1 text-[11px]">
                        <input type="checkbox" className="accent-foreground" checked={selected.has(k)} onChange={() => toggle(k)} />
                        <span>Weź z serwera</span>
                      </label>
                    </div>
                    <pre className="overflow-x-auto text-xs whitespace-pre-wrap bg-amber-50/60 p-2 rounded">{renderDiff(String((conflict?.local as any)?.[k] ?? ""), String((conflict?.server as any)?.[k] ?? ""), "local")}</pre>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium">Wartości na serwerze</div>
              <ul className="mt-1 space-y-1">
                {fields.map((k) => (
                  <li key={`s-${k}`} className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <pre className="overflow-x-auto text-xs whitespace-pre-wrap bg-emerald-50/60 p-2 rounded">{renderDiff(String((conflict?.server as any)?.[k] ?? ""), String((conflict?.local as any)?.[k] ?? ""), "server")}</pre>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onResolve("takeServer", fields)}>Załaduj z serwera</Button>
          <Button type="button" variant="outline" onClick={() => onResolve("manualMerge", Array.from(selected))}>Scal i zapisz</Button>
          <Button type="button" variant="destructive" onClick={() => onResolve("overwriteServer", [])}>Nadpisz serwer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderDiff(a: string, b: string, side: "local" | "server"): React.ReactNode {
  if (a === b) return a;
  // Simple diff: highlight middle differing segment using common prefix/suffix
  const prefixLen = commonPrefixLen(a, b);
  const suffixLen = commonSuffixLen(a, b, prefixLen);
  const aMid = a.slice(prefixLen, a.length - suffixLen);
  const aPre = a.slice(0, prefixLen);
  const aSuf = a.slice(a.length - suffixLen);
  const cls = side === "local" ? "bg-amber-300/50" : "bg-emerald-300/50";
  return (
    <>
      <span>{aPre}</span>
      <span className={cls}>{aMid || (a.length !== b.length ? "" : aMid)}</span>
      <span>{aSuf}</span>
    </>
  );
}

function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

function commonSuffixLen(a: string, b: string, prefixLen: number): number {
  const aLen = a.length;
  const bLen = b.length;
  const max = Math.min(aLen - prefixLen, bLen - prefixLen);
  let i = 0;
  while (i < max && a.charCodeAt(aLen - 1 - i) === b.charCodeAt(bLen - 1 - i)) i++;
  return i;
}



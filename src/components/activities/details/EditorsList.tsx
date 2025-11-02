import * as React from "react";
import type { ActivityEditorDTO } from "@/types";

export interface EditorsListProps {
  editors?: ActivityEditorDTO[];
  loading?: boolean;
}

export function EditorsList({ editors, loading }: EditorsListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 w-40 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (!editors || editors.length === 0) {
    return <div className="text-sm text-muted-foreground">Brak przypisanych edytorów.</div>;
  }
  return (
    <ul className="space-y-2">
      {editors.map((e) => (
        <li key={`${e.activity_id}:${e.user_id}`} className="text-sm">
          <span className="font-medium">{e.user_id}</span>
          <span className="text-muted-foreground"> — {new Date(e.assigned_at).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}



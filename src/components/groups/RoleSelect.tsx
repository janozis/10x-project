import * as React from "react";
import type { GroupRole } from "@/types";
import { Label } from "@/components/ui/label";

export interface RoleSelectProps {
  value: GroupRole;
  disabled?: boolean;
  onChange: (role: GroupRole) => void;
  title?: string;
}

export function RoleSelect({ value, disabled, onChange, title }: RoleSelectProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="role-select" className="sr-only">Rola</Label>
      <select
        id="role-select"
        className="h-9 rounded-md border bg-background px-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Zmień rolę"
        aria-disabled={!!disabled}
        title={title}
        value={value}
        onChange={(e) => onChange(e.target.value as GroupRole)}
        disabled={disabled}
      >
        <option value="admin">admin</option>
        <option value="editor">editor</option>
        <option value="member">member</option>
      </select>
    </div>
  );
}



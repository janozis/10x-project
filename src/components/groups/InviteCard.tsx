import * as React from "react";
import type { InviteDTO, UUID } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  groupId: UUID;
  invite: InviteDTO | null;
  canManage: boolean;
  onRequestRotate: () => void;
  cooldownMs?: number;
}

export function InviteCard({ invite, canManage, onRequestRotate, cooldownMs }: Props): JSX.Element | null {
  // Hooks must be called before any conditional returns
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!canManage) return null;
  if (!invite) return null;

  const joinLink = `/join?code=${invite.code}`;
  const masked = show ? invite.code : maskCode(invite.code);
  const disabled = busy || (cooldownMs !== undefined && cooldownMs > 0);

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Zaproszenie do grupy</div>
        <div className="text-xs text-muted-foreground">
          {invite.expires_at ? `Wygasa: ${formatDateTime(invite.expires_at)}` : "Bez terminu"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-sm">{masked}</code>
        <Button type="button" variant="outline" size="sm" onClick={() => setShow((s) => !s)}>
          {show ? "Ukryj" : "Pokaż"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(invite.code);
            toast.success("Skopiowano kod zaproszenia");
          }}
          data-test-id="groups-settings-copy-code-button"
        >
          Kopiuj kod
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(joinLink);
            toast.success("Skopiowano link do zaproszenia");
          }}
          data-test-id="groups-settings-copy-link-button"
        >
          Kopiuj link
        </Button>
        <div className="ml-auto">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onRequestRotate();
            }}
          >
            {cooldownMs && cooldownMs > 0 ? `Odczekaj ${Math.ceil(cooldownMs / 1000)}s` : "Rotuj kod"}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Użycia: {invite.current_uses}/{invite.max_uses || "—"}
      </div>
    </div>
  );
}

function maskCode(code: string): string {
  if (code.length <= 2) return "••";
  const start = code.slice(0, 2);
  const end = code.slice(-1);
  return `${start}${"•".repeat(Math.max(0, code.length - 3))}${end}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

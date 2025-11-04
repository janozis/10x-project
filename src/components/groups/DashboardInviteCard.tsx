import * as React from "react";
import type { GroupDTO, UUID } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { rotateInvite } from "@/lib/groups/api.client";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";

interface DashboardInviteCardProps {
  groupId: UUID;
  group: GroupDTO;
  canManage: boolean;
}

export function DashboardInviteCard({ groupId, group, canManage }: DashboardInviteCardProps): JSX.Element | null {
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<"generate" | "rotate" | undefined>(undefined);
  const [joinLink, setJoinLink] = React.useState<string>("");

  const invite = group.invite;

  // Set joinLink only on client side
  React.useEffect(() => {
    if (invite?.code && typeof window !== "undefined") {
      setJoinLink(`${window.location.origin}/join?code=${invite.code}`);
    }
  }, [invite?.code]);

  // Don't show for non-admins or archived groups
  if (!canManage || group.status === "archived") {
    return null;
  }

  const hasInviteCode = invite && invite.code;

  const handleGenerateOrRotate = async () => {
    setBusy(true);
    try {
      const res = await rotateInvite(groupId);
      if ("data" in res) {
        toast.success(hasInviteCode ? "Zrotowano kod zaproszenia" : "Wygenerowano kod zaproszenia");
        // Reload page to show new code
        window.location.reload();
      } else if ("error" in res) {
        toast.error(res.error.message || "Nie udało się wygenerować kodu");
      }
    } catch (e: any) {
      toast.error(e?.message || "Wystąpił błąd");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
      setConfirmAction(undefined);
    }
  };

  if (!hasInviteCode) {
    // No invite code yet - show a prompt to generate one
    return (
      <div className="rounded-md border border-dashed p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Kod zaproszenia</div>
            <div className="text-xs text-muted-foreground mt-1">
              Wygeneruj kod, aby zaprosić członków do grupy
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => {
              setConfirmAction("generate");
              setConfirmOpen(true);
            }}
          >
            Wygeneruj kod
          </Button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={(v) => {
            setConfirmOpen(v);
            if (!v) setConfirmAction(undefined);
          }}
          title="Wygenerować kod zaproszenia?"
          description="Utworzy nowy 8-znakowy kod, który pozwoli innym dołączyć do grupy."
          confirmText="Wygeneruj"
          onConfirm={handleGenerateOrRotate}
        />
      </div>
    );
  }

  // Has invite code - show full card
  const masked = show ? invite.code : maskCode(invite.code);

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Zaproszenie do grupy</div>
        <div className="text-xs text-muted-foreground">
          {invite.expires_at ? `Wygasa: ${formatDateTime(invite.expires_at)}` : "Bez terminu"}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
        >
          Kopiuj link
        </Button>
        <div className="ml-auto">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => {
              setConfirmAction("rotate");
              setConfirmOpen(true);
            }}
          >
            Rotuj kod
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Użycia: {invite.current_uses}/{invite.max_uses || "—"}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setConfirmAction(undefined);
        }}
        title="Zrotować kod zaproszenia?"
        description="Zmieni kod zaproszenia – poprzedni przestanie działać."
        confirmText="Rotuj"
        onConfirm={handleGenerateOrRotate}
      />
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


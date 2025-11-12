interface AutosaveIndicatorProps {
  lastSavedAt?: Date;
  draftsCount?: number;
  error?: string | null;
}

export function AutosaveIndicator({ lastSavedAt, draftsCount = 0, error }: AutosaveIndicatorProps): JSX.Element {
  return (
    <div className="text-xs text-muted-foreground">
      {error ? (
        <span className="text-destructive">Błąd szkicu: {error}</span>
      ) : lastSavedAt ? (
        <span>
          Zapisano szkic {formatRelative(lastSavedAt)} • szkice: {draftsCount}
        </span>
      ) : (
        <span>Szkice: {draftsCount}</span>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s temu`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m temu`;
  const h = Math.floor(m / 60);
  return `${h}h temu`;
}

import { useHealth } from "@/hooks/use-queries";
import { cn } from "@/lib/utils";

export function ConnectionStatusBadge({ className }: { className?: string }) {
  const { data, isLoading } = useHealth();
  const status = isLoading ? "checking" : data?.status ?? "down";

  const map: Record<string, { dot: string; label: string; text: string }> = {
    ok: { dot: "bg-success", label: "API Connected", text: "text-success" },
    degraded: { dot: "bg-warning", label: "API Degraded", text: "text-warning" },
    down: { dot: "bg-destructive", label: "API Offline", text: "text-destructive" },
    checking: { dot: "bg-muted-foreground", label: "Checking…", text: "text-muted-foreground" },
  };
  const cfg = map[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium",
        cfg.text,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            cfg.dot,
          )}
        />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      {cfg.label}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

const tones = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export function StatCard({ label, value, icon: Icon, delta, tone = "default" }: Props) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
        {delta && <p className="text-muted-foreground text-xs">{delta}</p>}
      </div>
    </Card>
  );
}

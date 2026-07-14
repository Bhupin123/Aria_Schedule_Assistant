import { Calendar, Clock, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Booking } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<Booking["status"], string> = {
  confirmed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-muted text-muted-foreground border-border",
};

export function BookingCard({ booking }: { booking: Booking }) {
  const dateLabel = new Date(booking.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Link to="/bookings/$id" params={{ id: booking.id }} className="block">
      <Card className="hover:border-ring/40 hover:shadow-elegant group cursor-pointer p-4 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{booking.title}</h3>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateLabel}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {booking.time} · {booking.durationMinutes}m</span>
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{booking.email}</span>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 capitalize", statusStyles[booking.status])}>
            {booking.status}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

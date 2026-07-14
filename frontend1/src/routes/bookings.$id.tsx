import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  Mail,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBooking } from "@/hooks/use-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Booking ${params.id} · Aria` },
      { name: "description", content: "Appointment details." },
    ],
  }),
  component: BookingDetailPage,
});

function BookingDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useBooking(id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-64 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl font-semibold">Booking not found</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            The booking with ID <code>{id}</code> doesn't exist.
          </p>
          <Button asChild className="mt-6">
            <Link to="/bookings">Back to bookings</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const dateLabel = new Date(data.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const createdLabel = new Date(data.createdAt).toLocaleString();

  const statusColor: Record<typeof data.status, string> = {
    confirmed: "text-success bg-success/10 border-success/20",
    pending: "text-warning bg-warning/10 border-warning/20",
    cancelled: "text-destructive bg-destructive/10 border-destructive/20",
    completed: "text-muted-foreground bg-muted border-border",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/bookings"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="gradient-brand-bg p-6 text-primary-foreground">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                  Appointment
                </p>
                <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{data.title}</h1>
              </div>
              <Badge
                variant="outline"
                className={cn("border capitalize", statusColor[data.status], "bg-background/90")}
              >
                {data.status}
              </Badge>
            </div>
          </div>

          <dl className="divide-border grid divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            <Row icon={Calendar} label="Date" value={dateLabel} />
            <Row icon={Clock} label="Time" value={`${data.time} · ${data.durationMinutes} min`} />
            <Row icon={Mail} label="Email" value={data.email} />
            <Row icon={Hash} label="Booking ID" value={data.id} mono />
            <Row icon={Clock} label="Created" value={createdLabel} />
            <Row
              icon={data.notified ? Bell : BellOff}
              label="Notification"
              value={data.notified ? "Sent" : "Not sent"}
            />
          </dl>

          {data.notes && (
            <div className="border-t p-6">
              <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Notes
              </h3>
              <p className="mt-2 text-sm">{data.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t p-6">
            <Button onClick={() => toast.success("Confirmation resent")}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resend confirmation
            </Button>
            <Button variant="outline" onClick={() => toast.info("Reschedule flow coming soon")}>
              Reschedule
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive ml-auto">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Cancel booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will notify the attendee and free up the time slot.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      toast.success("Booking cancelled");
                      setConfirmOpen(false);
                    }}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Cancel booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-6">
      <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className={cn("mt-1.5 text-sm", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

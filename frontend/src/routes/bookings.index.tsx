import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar, CalendarDays, CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { BookingCard } from "@/components/bookings/booking-card";
import { StatCard } from "@/components/bookings/stat-card";
import { useBookings } from "@/hooks/use-queries";
import type { Booking } from "@/types";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings · Aria" },
      { name: "description", content: "Manage upcoming and past appointments." },
    ],
  }),
  component: BookingsPage,
});

const PAGE_SIZE = 6;

/**
 * Returns today's date as a "YYYY-MM-DD" string in LOCAL time.
 * Never use `new Date().toISOString()` for this — that's UTC and
 * will be wrong for anyone in UTC+offset (e.g. NPT is UTC+5:45).
 */
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Extracts just the YYYY-MM-DD portion from whatever the API returns.
 * booking_date from FastAPI can arrive as:
 *   "2025-07-15"           (plain date — most common)
 *   "2025-07-15T00:00:00"  (datetime string)
 * We always want just the date part for comparison.
 */
function toDateStr(value: string): string {
  return value.slice(0, 10);
}

function isToday(bookingDate: string): boolean {
  return toDateStr(bookingDate) === localToday();
}

function isUpcoming(bookingDate: string): boolean {
  return toDateStr(bookingDate) > localToday();
}

function BookingsPage() {
  const { data, isLoading, error } = useBookings();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Booking["status"]>("all");
  const [page, setPage] = useState(1);

  const bookings = data ?? [];

  const stats = useMemo(
    () => ({
      today: bookings.filter((b) => isToday(b.date)).length,
      upcoming: bookings.filter(
        (b) => isUpcoming(b.date) && b.status !== "cancelled",
      ).length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings],
  );

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        b.title.toLowerCase().includes(s) ||
        b.email.toLowerCase().includes(s) ||
        b.id.toLowerCase().includes(s)
      );
    });
  }, [bookings, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const today = bookings.filter((b) => isToday(b.date));
  const todayScheduledCount = today.filter((b) => b.status !== "cancelled").length;

  const upcoming = bookings
    .filter((b) => isUpcoming(b.date) && b.status !== "cancelled")
    .slice(0, 4);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of your appointments and availability.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Today" value={stats.today} icon={Calendar} tone="default" />
          <StatCard label="Upcoming" value={stats.upcoming} icon={CalendarDays} tone="default" />
          <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} tone="success" />
          <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="destructive" />
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Today's appointments</h2>
              <span className="text-muted-foreground text-xs">{todayScheduledCount} scheduled</span>
            </div>
            {today.length === 0 ? (
              <EmptyState
                title="Nothing on your plate today"
                desc="Enjoy the quiet — or ask Aria to fill a slot."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {today.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Next up</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="No upcoming bookings" desc="You're all clear." />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(`${toDateStr(b.date)}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {b.time}
                      </p>
                    </div>
                    <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">All bookings</h2>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search bookings…"
                  className="w-64 pl-9"
                />
              </div>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as typeof status);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center text-sm text-destructive">
              Failed to load bookings.
            </Card>
          ) : current.length === 0 ? (
            <Card className="p-10">
              <EmptyState title="No bookings match" desc="Try clearing your filters." />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {current.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={page === i + 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <div className="bg-muted grid h-10 w-10 place-items-center rounded-full">
        <Calendar className="text-muted-foreground h-5 w-5" />
      </div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="text-muted-foreground text-xs">{desc}</p>
    </div>
  );
}
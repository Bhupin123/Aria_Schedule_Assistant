import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, Calendar, MessageSquare, Settings as SettingsIcon, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectionStatusBadge } from "@/components/connection-status-badge";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/bookings", label: "Bookings", icon: Calendar },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="gradient-brand-bg grid h-8 w-8 place-items-center rounded-lg shadow-glow">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-display text-base tracking-tight">Aria</span>
          <span className="text-muted-foreground hidden text-xs sm:inline">/ Scheduling AI</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(n.to)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ConnectionStatusBadge className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/chat">Launch app</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  isActive(n.to)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
            <ConnectionStatusBadge className="mt-2 self-start" />
          </div>
        </div>
      )}
    </header>
  );
}

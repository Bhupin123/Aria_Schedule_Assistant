import { createFileRoute } from "@tanstack/react-router";
import { Bell, Info, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/context/theme-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Aria" },
      { name: "description", content: "Configure theme, notifications and API connection." },
    ],
  }),
  component: SettingsPage,
});

// ── helpers ──────────────────────────────────────────────────────────────────

function getStored(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) {
      localStorage.setItem(key, String(fallback));
      return fallback;
    }
    return v === "true";
  } catch {
    return fallback;
  }
}

function store(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

function sendBrowserNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

// ── page ─────────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [emailNotif, setEmailNotif] = useState<boolean>(() => getStored("aria:emailNotif", true));
  const [pushNotif, setPushNotif] = useState<boolean>(() => getStored("aria:pushNotif", false));
  const [reminderNotif, setReminderNotif] = useState<boolean>(() => getStored("aria:reminderNotif", true));

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && pushNotif) {
      setPushNotif(false);
      store("aria:pushNotif", false);
    }
  }, []);

  // ── handlers ───────────────────────────────────────────────────────────────

  function handleEmailToggle(val: boolean) {
    setEmailNotif(val);
    store("aria:emailNotif", val);
    if (val) {
      toast.success("Email confirmations enabled", {
        description: "You'll receive an email for every booking update.",
      });
    } else {
      toast.info("Email confirmations disabled");
    }
  }

  async function handlePushToggle(val: boolean) {
    if (val) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications.");
        return;
      }

      if (Notification.permission === "denied") {
        toast.error(
          <div className="space-y-1">
            <p className="font-medium">Notifications are blocked</p>
            <p className="text-xs">
              Click the <strong>lock icon </strong> in your address bar →
              Notifications → <strong>Allow</strong> → then refresh.
            </p>
          </div>,
          { duration: 8000 }
        );
        return;
      }

      const result = await Notification.requestPermission();
      if (result !== "granted") {
        toast.error("Permission denied — notifications won't work.");
        return;
      }

      setPushNotif(true);
      store("aria:pushNotif", true);
      toast.success("Push notifications enabled");
      sendBrowserNotification("Aria – Notifications On", "You'll be notified of new bookings in real time.");
    } else {
      setPushNotif(false);
      store("aria:pushNotif", false);
      toast.info("Push notifications disabled");
    }
  }

  function handleReminderToggle(val: boolean) {
    setReminderNotif(val);
    store("aria:reminderNotif", val);
    if (val) {
      toast.success("Reminders enabled", {
        description: "You'll get a reminder 15 minutes before each appointment.",
      });
      setTimeout(() => {
        if (Notification.permission === "granted") {
          sendBrowserNotification("Aria Reminder", "Your next appointment starts in 15 minutes.");
        } else {
          toast.message(" Reminder", {
            description: "Your next appointment starts in 15 minutes.",
          });
        }
      }, 5_000);
    } else {
      toast.info("Reminders disabled");
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Customize your Aria experience and integrations.
          </p>
        </header>

        <div className="space-y-6">
          {/* Appearance */}
          <Card className="p-6">
            <SectionHeader title="Appearance" desc="Choose how Aria looks to you." />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`border-border hover:border-ring/40 flex flex-col items-center gap-2 rounded-lg border p-4 text-sm capitalize transition-colors ${
                    theme === t ? "border-ring bg-accent/50 ring-ring/30 ring-2" : ""
                  }`}
                >
                  {t === "light" ? (
                    <Sun className="h-5 w-5" />
                  ) : t === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <span className="flex">
                      <Sun className="h-5 w-5" />
                      <Moon className="-ml-1 h-5 w-5" />
                    </span>
                  )}
                  {t}
                </button>
              ))}
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <SectionHeader
              title="Notifications"
              desc="Control how Aria keeps you informed about bookings."
            />
            <div className="mt-4 space-y-1">
              <ToggleRow
                icon={Bell}
                label="Email confirmations"
                desc="Receive an email each time a booking is created or updated."
                checked={emailNotif}
                onCheckedChange={handleEmailToggle}
              />
              <Separator />
              <ToggleRow
                icon={Bell}
                label="Push notifications"
                desc="Real-time browser notifications for new bookings."
                checked={pushNotif}
                onCheckedChange={handlePushToggle}
              />
              <Separator />
              <ToggleRow
                icon={Bell}
                label="Reminders"
                desc="Send a reminder 15 minutes before each appointment."
                checked={reminderNotif}
                onCheckedChange={handleReminderToggle}
              />
            </div>
          </Card>

          {/* About */}
          <Card className="p-6">
            <SectionHeader title="About" desc="System information." />
            <div className="text-muted-foreground mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" /> Aria v1.0.0 · Multi-Agent Scheduling
              </div>
              <p>
                Version 1.0.0 · Multi-Agent Scheduling Assistant
                <br />
                Frontend: React · TanStack Router · Tailwind CSS · shadcn/ui
                <br />
                Backend: FastAPI · LangGraph · Groq LLM · SQLite
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground text-xs">{desc}</p>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  Cpu,
  MessageSquare,
  Sparkles,
  Workflow,
  Zap,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aria — Conversational AI Scheduling" },
      {
        name: "description",
        content:
          "Book, reschedule and manage appointments through a multi-agent AI assistant. Beautiful, fast, and built for teams.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MessageSquare,
    title: "Natural conversation",
    desc: "Book meetings the way you'd text a colleague. Aria understands intent, times, and time zones.",
  },
  {
    icon: Workflow,
    title: "Multi-agent orchestration",
    desc: "Specialized agents handle intent, availability, confirmation, and notifications — in parallel.",
  },
  {
    icon: Calendar,
    title: "Live calendar sync",
    desc: "Two-way sync with your calendar. See conflicts, availability, and buffer times in real time.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    desc: "Email confirmations, reminders and cancellations are sent automatically at the right moment.",
  },
  {
    icon: ShieldCheck,
    title: "Production-ready",
    desc: "Typed APIs, retries, health checks and observability baked in from day one.",
  },
  {
    icon: Zap,
    title: "Blazing fast",
    desc: "Streaming responses, optimistic updates, and edge-ready — every interaction feels instant.",
  },
];

const agents = [
  { name: "Intent Agent", role: "Parses natural language into structured booking commands." },
  { name: "Availability Agent", role: "Queries your calendar for open slots and buffer windows." },
  { name: "Booking Agent", role: "Creates, updates and cancels appointments transactionally." },
  { name: "Notification Agent", role: "Sends confirmations, reminders, and follow-ups." },
];

const steps = [
  { title: "Ask", desc: "Type a natural request like 'book a 30-min call with Sam next Tuesday afternoon'." },
  { title: "Reason", desc: "Aria's agents parse intent, check availability and propose the best slot." },
  { title: "Confirm", desc: "Review, tweak or accept. Aria creates the booking and notifies attendees." },
];

function Landing() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mesh-bg relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="bg-card text-muted-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm">
              <Sparkles className="text-primary h-3.5 w-3.5" />
              Multi-agent AI · Now in preview
            </div>
            <h1 className="font-display mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Scheduling, <span className="gradient-text">reimagined</span> as a conversation.
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
              Aria is a production-ready AI assistant that books, reschedules and manages your
              calendar through natural language — powered by a coordinated team of specialist agents.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/chat">
                  Try the chat <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/bookings">View bookings</Link>
              </Button>
            </div>

            <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5"><Check className="text-success h-3.5 w-3.5" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><Check className="text-success h-3.5 w-3.5" /> FastAPI backend</span>
              <span className="inline-flex items-center gap-1.5"><Check className="text-success h-3.5 w-3.5" /> Open architecture</span>
            </div>
          </div>

          {/* Preview card */}
          <div className="mx-auto mt-16 max-w-4xl">
            <Card className="shadow-elegant overflow-hidden p-0">
              <div className="bg-muted/50 flex items-center gap-1.5 border-b px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="text-muted-foreground ml-3 text-xs">aria.app / chat</span>
              </div>
              <div className="space-y-4 p-6">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground max-w-sm rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                    Book a 30-min product demo with alex@acme.com next Thursday at 3pm.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="gradient-brand-bg grid h-8 w-8 shrink-0 place-items-center rounded-full">
                    <Bot className="text-primary-foreground h-4 w-4" />
                  </div>
                  <div className="bg-card max-w-sm rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm">
                    Confirmed ✅ Thursday, 3:00–3:30 PM with alex@acme.com. I've sent a calendar
                    invite and a reminder is queued for 15 minutes before.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Built for teams that move fast
            </h2>
            <p className="text-muted-foreground mt-4">
              Every detail obsessed over. From the first message to the final confirmation.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-lg">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="bg-surface/50 border-t py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-primary inline-flex items-center gap-2 text-sm font-medium">
                <Cpu className="h-4 w-4" /> Architecture
              </div>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                A coordinated team of specialists
              </h2>
              <p className="text-muted-foreground mt-4">
                Aria isn't a single monolithic LLM. It's a network of focused agents that share
                context and hand off work — resilient, observable and easy to extend.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-sm">
                {["Typed FastAPI endpoints", "Streaming responses", "Retry & backoff built-in", "Pluggable providers"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Check className="text-success h-4 w-4" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {agents.map((a, i) => (
                <Card key={a.name} className="p-5" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="gradient-brand-bg grid h-9 w-9 place-items-center rounded-lg shadow-glow">
                    <Bot className="text-primary-foreground h-4 w-4" />
                  </div>
                  <h3 className="mt-3 font-semibold">{a.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{a.role}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="text-muted-foreground mt-4">Three simple steps from intent to invite.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="p-6">
                <div className="text-primary font-display text-4xl font-bold opacity-30">
                  0{i + 1}
                </div>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Card className="gradient-brand-bg shadow-glow overflow-hidden border-0 p-10 text-center sm:p-16">
            <h2 className="font-display text-primary-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to chat with Aria?
            </h2>
            <p className="text-primary-foreground/90 mx-auto mt-3 max-w-xl">
              Point it at your FastAPI backend and start scheduling in seconds.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/chat">Open chat <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10">
                <Link to="/settings">Configure API</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="gradient-brand-bg grid h-5 w-5 place-items-center rounded">
              <Bot className="text-primary-foreground h-3 w-3" />
            </span>
            © {new Date().getFullYear()} Aria. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/settings" className="hover:text-foreground">Settings</Link>
            <Link to="/bookings" className="hover:text-foreground">Bookings</Link>
            <Link to="/chat" className="hover:text-foreground">Chat</Link>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

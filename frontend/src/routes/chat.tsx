import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Plus, Sparkles, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { chatApi } from "@/services/api";
import type { ChatMessage, Conversation } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat · Aria" },
      { name: "description", content: "Chat with your AI scheduling assistant." },
    ],
  }),
  component: ChatPage,
});

const STORAGE_KEY = "aria-conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // ignore
  }
}

const suggestions = [
  "Book a 30-min demo with alex@acme.com next Thursday at 3pm",
  "What does my Friday look like?",
  "Reschedule my 2pm today to tomorrow morning",
  "Cancel all bookings this weekend",
];

function ChatPage() {
  const [conversations, setConversationsRaw] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Wrap setter to always persist
  const setConversations = (updater: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    setConversationsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveConversations(next);
      return next;
    });
  };

  useEffect(() => {
    setConversationsRaw(loadConversations());
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length]);

  const sendMutation = useMutation({
    mutationFn: async ({ message, conversationId }: { message: string; conversationId?: string }) =>
      chatApi.send({ message, conversationId }),
  });

  const newConversation = () => {
    const c: Conversation = {
      id: crypto.randomUUID(),
      title: "New conversation",
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  const ensureActive = (): Conversation => {
    if (active) return active;
    const c: Conversation = {
      id: crypto.randomUUID(),
      title: "New conversation",
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    return c;
  };

  const stop = () => {
    abortRef.current?.abort();
    sendMutation.reset();
  };

  const send = async (content: string) => {
    if (sendMutation.isPending) return;
    const conv = ensureActive();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              title: c.messages.length === 0 ? content.slice(0, 60) : c.title,
              updatedAt: new Date().toISOString(),
              messages: [...c.messages, userMsg],
            }
          : c,
      ),
    );

    abortRef.current = new AbortController();

    try {
      const res = await sendMutation.mutateAsync({ message: content, conversationId: conv.id });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? { ...c, updatedAt: new Date().toISOString(), messages: [...c.messages, res.message] }
            : c,
        ),
      );
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    }
  };

  const regenerate = async () => {
    if (!active) return;
    const lastUser = [...active.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c;
        const trimmed = [...c.messages];
        if (trimmed[trimmed.length - 1]?.role === "assistant") trimmed.pop();
        return { ...c, messages: trimmed };
      }),
    );
    await send(lastUser.content);
  };

  const messages = active?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "bg-sidebar hidden w-72 shrink-0 flex-col border-r md:flex",
            !sidebarOpen && "md:hidden",
          )}
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <Button size="sm" variant="ghost" onClick={newConversation}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2">
            {conversations.length === 0 && (
              <div className="text-muted-foreground p-4 text-center text-xs">
                No conversations yet
              </div>
            )}
            <div className="flex flex-col gap-1 pb-4">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    c.id === activeId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    className="hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main chat */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:inline-flex"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <h1 className="truncate text-sm font-semibold">
                {active?.title ?? "New conversation"}
              </h1>
            </div>
            <Button size="sm" variant="outline" onClick={newConversation}>
              <Plus className="mr-1 h-3.5 w-3.5" /> New
            </Button>
          </div>

          <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
            {isEmpty ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
                <div className="gradient-brand-bg shadow-glow grid h-14 w-14 place-items-center rounded-2xl">
                  <Bot className="text-primary-foreground h-6 w-6" />
                </div>
                <h2 className="font-display mt-4 text-2xl font-semibold">
                  How can I help you schedule today?
                </h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Ask me to book, reschedule, or check availability. I can handle multiple attendees
                  and time zones.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="bg-card hover:border-ring/40 hover:shadow-elegant group rounded-xl border p-4 text-left text-sm transition-all"
                    >
                      <Sparkles className="text-primary mb-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isLast={i === messages.length - 1 && m.role === "assistant"}
                    onRegenerate={regenerate}
                  />
                ))}
                {sendMutation.isPending && (
                  <div className="flex items-start gap-3">
                    <div className="gradient-brand-bg grid h-8 w-8 shrink-0 place-items-center rounded-full">
                      <Bot className="text-primary-foreground h-4 w-4" />
                    </div>
                    <div className="bg-card rounded-2xl rounded-bl-md border px-4 py-1">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <ChatInput
              onSend={send}
              onStop={stop}
              isLoading={sendMutation.isPending}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
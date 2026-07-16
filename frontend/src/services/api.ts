import axios, { AxiosError } from "axios";
import type {
  Booking,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  HealthStatus,
} from "@/types";

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (!error.response) {
      return Promise.reject(new Error("Network error — please check your connection."));
    }
    const data = error.response.data as { detail?: string; message?: string } | undefined;
    const msg = data?.detail ?? data?.message ?? `Request failed (${error.response.status})`;
    return Promise.reject(new Error(msg));
  },
);

// ---------------- Mock fallback (used only when the real API is unreachable) ----------------
const now = () => new Date().toISOString();

const mockAssistantReply = (message: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: now(),
  status: "sent",
  content: `I received: **"${message}"**.\n\nI'm currently running in **offline demo mode** because the backend is not reachable at \`${baseURL}\`.\n\n- Configure \`VITE_API_BASE_URL\` to point to your backend\n- Endpoints expected:\n  - \`POST /chat/messages\` — body: \`{ thread_id, message }\`\n  - \`GET /chat/threads/{thread_id}/history\`\n  - \`GET /bookings\`\n  - \`GET /health\``,
});

const mockBookings: Booking[] = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + (i - 3));
  const statuses: Booking["status"][] = ["confirmed", "pending", "completed", "cancelled"];
  return {
    id: `bk_${1000 + i}`,
    title: [
      "Product demo",
      "Discovery call",
      "Design sync",
      "Onboarding session",
      "Support call",
    ][i % 5],
    email: `client${i + 1}@example.com`,
    date: d.toISOString(),
    time: `${String(9 + (i % 8)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    durationMinutes: 30,
    status: statuses[i % statuses.length],
    createdAt: new Date(d.getTime() - 86400000).toISOString(),
    notified: i % 3 !== 0,
    notes: i % 2 ? "Prepared agenda shared via email." : undefined,
  };
});

const safe = async <T>(fn: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback();
  }
};

// Normalize a variety of possible backend response shapes into our ChatMessage
const normalizeAssistantMessage = (raw: unknown): ChatMessage => {
  const r = (raw ?? {}) as Record<string, unknown>;
  const content =
    (r.content as string) ??
    (r.message as string) ??
    (r.reply as string) ??
    (r.response as string) ??
    "";
  return {
    id: (r.id as string) ?? crypto.randomUUID(),
    role: "assistant",
    content: typeof content === "string" ? content : JSON.stringify(content),
    timestamp: (r.timestamp as string) ?? (r.created_at as string) ?? now(),
    status: "sent",
  };
};

// ---------------- API ----------------
export const chatApi = {
  send: async (body: ChatRequest): Promise<ChatResponse> => {
    const thread_id = body.thread_id ?? body.conversationId;
    try {
      const { data } = await api.post<unknown>("/chat/messages", {
        thread_id,
        message: body.message,
      });
      const d = (data ?? {}) as Record<string, unknown>;
      const returnedThread =
        (d.thread_id as string) ?? thread_id ?? crypto.randomUUID();
      const messageRaw = (d.message as unknown) ?? d;
      return {
        thread_id: returnedThread,
        conversationId: returnedThread,
        message: normalizeAssistantMessage(messageRaw),
      } as ChatResponse;
    } catch (err) {
      // Only fall back to mock if truly offline (no response at all)
      if (err instanceof AxiosError && !err.response) {
        const tid = thread_id ?? crypto.randomUUID();
        return {
          thread_id: tid,
          conversationId: tid,
          message: mockAssistantReply(body.message),
        };
      }
      throw err; // Let real errors surface
    }
  },
  history: (threadId: string) =>
    safe(
      async () => {
        const { data } = await api.get<unknown>(
          `/chat/threads/${encodeURIComponent(threadId)}/history`,
        );
        const list = Array.isArray(data)
          ? data
          : ((data as { messages?: unknown[] })?.messages ?? []);
        return (list as Record<string, unknown>[]).map((m) => ({
          id: (m.id as string) ?? crypto.randomUUID(),
          role: ((m.role as ChatMessage["role"]) ?? "assistant"),
          content: (m.content as string) ?? (m.message as string) ?? "",
          timestamp: (m.timestamp as string) ?? (m.created_at as string) ?? now(),
          status: "sent" as const,
        }));
      },
      () => [] as ChatMessage[],
    ),
};

export const bookingsApi = {
  list: async (): Promise<Booking[]> => {
    const { data } = await api.get<unknown>("/bookings");
    const raw = data as { items?: unknown[] } | unknown[];
    const list = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] }).items ?? []);
    return (list as Record<string, unknown>[]).map((b) => ({
      id: b.id as string,
      title: (b.purpose as string) ?? "Meeting",
      email: b.email as string,
      date: b.booking_date as string,
      time: ((b.booking_time as string) ?? "").slice(0, 5), // "15:00:00" → "15:00"
      durationMinutes: 30,
      status: b.status as Booking["status"],
      createdAt: b.created_at as string,
      notified: false,
      notes: undefined,
    }));
  },
  get: async (id: string): Promise<Booking | null> => {
    try {
      const { data } = await api.get<Record<string, unknown>>(`/bookings/${encodeURIComponent(id)}`);
      return {
        id: data.id as string,
        title: (data.purpose as string) ?? "Meeting",
        email: data.email as string,
        date: data.booking_date as string,
        time: ((data.booking_time as string) ?? "").slice(0, 5),
        durationMinutes: 30,
        status: data.status as Booking["status"],
        createdAt: data.created_at as string,
        notified: false,
        notes: undefined,
      };
    } catch {
      const list = await bookingsApi.list();
      return list.find((b) => b.id === id) ?? null;
    }
  },
};

export const systemApi = {
  health: () =>
    safe(
      async () => (await api.get<HealthStatus>("/health")).data,
      () => ({ status: "down" as const }),
    ),
};

export const apiBaseUrl = baseURL;

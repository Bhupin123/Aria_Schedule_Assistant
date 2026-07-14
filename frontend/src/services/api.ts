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

const now = () => new Date().toISOString();

const mockBookings: Booking[] = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + (i - 3));
  const statuses: Booking["status"][] = ["confirmed", "pending", "completed", "cancelled"];
  return {
    id: `bk_${1000 + i}`,
    title: ["Product demo", "Discovery call", "Design sync", "Onboarding session", "Support call"][i % 5],
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

function mapBooking(raw: Record<string, unknown>): Booking {
  // "2026-07-16" → append T00:00:00 so JS parses as local time not UTC midnight
  const dateStr = (raw.booking_date ?? raw.date ?? "") as string;
  const isoDate = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;

  // "15:00:00.000000" → "15:00"
  const rawTime = (raw.booking_time ?? raw.time ?? "") as string;
  const time = rawTime.length > 5 ? rawTime.substring(0, 5) : rawTime;

  return {
    id: (raw.id as string) ?? "",
    title: (raw.purpose as string) ?? (raw.title as string) ?? "Appointment",
    email: (raw.email as string) ?? "",
    date: isoDate,
    time,
    durationMinutes: (raw.duration_minutes as number) ?? 30,
    status: (raw.status as Booking["status"]) ?? "confirmed",
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    notified: (raw.notified as boolean) ?? false,
    notes: (raw.notes as string) ?? undefined,
  };
}

export const chatApi = {
  send: async (body: ChatRequest): Promise<ChatResponse> => {
    const thread_id = body.thread_id ?? body.conversationId;
    const { data } = await api.post<unknown>("/chat/messages", {
      thread_id,
      message: body.message,
    });
    const d = (data ?? {}) as Record<string, unknown>;
    const returnedThread = (d.thread_id as string) ?? thread_id ?? crypto.randomUUID();
    const content =
      (d.response as string) ??
      (d.message as string) ??
      (d.reply as string) ??
      (d.content as string) ??
      "";
    return {
      thread_id: returnedThread,
      conversationId: returnedThread,
      message: {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content,
        timestamp: now(),
        status: "sent" as const,
      },
    } as ChatResponse;
  },

  history: async (threadId: string): Promise<ChatMessage[]> => {
    try {
      const { data } = await api.get<unknown>(
        `/chat/threads/${encodeURIComponent(threadId)}/history`,
      );
      const list = Array.isArray(data)
        ? data
        : ((data as { messages?: unknown[] })?.messages ?? []);
      return (list as Record<string, unknown>[]).map((m) => ({
        id: (m.id as string) ?? crypto.randomUUID(),
        role: (m.role as ChatMessage["role"]) ?? "assistant",
        content: (m.content as string) ?? (m.message as string) ?? "",
        timestamp: (m.timestamp as string) ?? (m.created_at as string) ?? now(),
        status: "sent" as const,
      }));
    } catch {
      return [];
    }
  },
};

export const bookingsApi = {
  list: async (): Promise<Booking[]> => {
    try {
      const { data } = await api.get<unknown>("/bookings");
      const raw =
        (data as { items?: unknown[] })?.items ??
        (Array.isArray(data) ? data : []);
      return (raw as Record<string, unknown>[]).map(mapBooking);
    } catch {
      return mockBookings;
    }
  },

  get: async (id: string): Promise<Booking | null> => {
    try {
      const { data } = await api.get<unknown>(`/bookings/${encodeURIComponent(id)}`);
      return mapBooking(data as Record<string, unknown>);
    } catch {
      const list = await bookingsApi.list();
      return list.find((b) => b.id === id) ?? null;
    }
  },

  cancel: async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.delete(`/bookings/${encodeURIComponent(bookingId)}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};

export const systemApi = {
  health: async (): Promise<HealthStatus> => {
    try {
      const { data } = await api.get<HealthStatus>("/health");
      return data;
    } catch {
      return { status: "down" as const };
    }
  },
};

export const apiBaseUrl = baseURL;
export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";

export interface Booking {
  id: string;
  title: string;
  email: string;
  date: string; // ISO
  time: string; // e.g. "14:30"
  durationMinutes: number;
  status: BookingStatus;
  createdAt: string;
  notified: boolean;
  notes?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version?: string;
  uptimeSeconds?: number;
}

export interface ChatRequest {
  message: string;
  thread_id?: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  thread_id: string;
  conversationId: string;
}


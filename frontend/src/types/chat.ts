export interface BookingContext {
  normalized_date: string | null
  normalized_time: string | null
  email: string | null
  purpose: string | null
  booking_id: string | null
  slot_reserved: boolean
  notification_sent: boolean
}

export interface BookingStatus {
  booking_confirmed: boolean
  booking_context: BookingContext | null
  available_slots: SlotInfo[]
  validation_errors: string[]
}

export interface SlotInfo {
  slot_id: string
  date: string
  time: string
  duration_minutes: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  bookingStatus?: BookingStatus
  isError?: boolean
}

export interface ChatRequest {
  thread_id: string
  message: string
}

export interface ChatResponse {
  thread_id: string
  response: string
  intent: string | null
  booking_status: BookingStatus
  turn_count: number
}

export interface HistoryResponse {
  thread_id: string
  messages: { role: string; content: string }[]
  booking_context: BookingContext | null
}

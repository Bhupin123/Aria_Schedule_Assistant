export interface Booking {
  id: string
  email: string
  booking_date: string
  booking_time: string
  purpose: string | null
  status: 'confirmed' | 'cancelled' | 'rescheduled'
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedBookings {
  items: Booking[]
  total: number
  page: number
  pages: number
}

export interface BookingCancelRequest {
  reason?: string
}

import api from './api'
import type { Booking, PaginatedBookings, BookingCancelRequest } from '../types/booking'

export const bookingsApi = {
  list: async (params?: {
    page?: number
    limit?: number
    email?: string
    status?: string
  }): Promise<PaginatedBookings> => {
    const { data } = await api.get<PaginatedBookings>('/api/v1/bookings', { params })
    return data
  },

  get: async (id: string): Promise<Booking> => {
    const { data } = await api.get<Booking>(`/api/v1/bookings/${id}`)
    return data
  },

  cancel: async (id: string, body?: BookingCancelRequest): Promise<Booking> => {
    const { data } = await api.delete<Booking>(`/api/v1/bookings/${id}`, { data: body })
    return data
  },
}

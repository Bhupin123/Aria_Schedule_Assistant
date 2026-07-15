import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../services/bookingsApi'

export function useBookings(params?: { page?: number; email?: string; status?: string }) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsApi.list(params),
    staleTime: 30_000,
  })
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingsApi.cancel(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

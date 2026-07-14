import { useQuery } from "@tanstack/react-query";
import { bookingsApi, systemApi } from "@/services/api";

export const useBookings = () =>
  useQuery({ queryKey: ["bookings"], queryFn: bookingsApi.list, staleTime: 30_000 });

export const useBooking = (id: string) =>
  useQuery({ queryKey: ["booking", id], queryFn: () => bookingsApi.get(id), enabled: !!id });

export const useHealth = () =>
  useQuery({
    queryKey: ["health"],
    queryFn: systemApi.health,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

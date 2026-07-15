import { create } from 'zustand'
import type { Message, BookingContext } from '../types/chat'

interface ChatStore {
  messages: Message[]
  isStreaming: boolean
  bookingContext: BookingContext | null
  appendMessage: (msg: Message) => void
  prependHistory: (msgs: Message[]) => void
  setStreaming: (v: boolean) => void
  setBookingContext: (ctx: BookingContext | null) => void
  rollbackTo: (snapshot: Message[]) => void
  reset: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  bookingContext: null,

  appendMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  prependHistory: (msgs) =>
    set({ messages: msgs }),

  setStreaming: (v) => set({ isStreaming: v }),

  setBookingContext: (ctx) => set({ bookingContext: ctx }),

  rollbackTo: (snapshot) => set({ messages: snapshot }),

  reset: () => set({ messages: [], isStreaming: false, bookingContext: null }),
}))

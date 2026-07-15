import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../services/chatApi'
import { useChatStore } from '../store/chatStore'
import type { Message } from '../types/chat'

export function useSendMessage(threadId: string) {
  const qc = useQueryClient()
  const { appendMessage, setStreaming, setBookingContext, rollbackTo, messages } = useChatStore()

  return useMutation({
    mutationFn: (content: string) =>
      chatApi.sendMessage({ thread_id: threadId, message: content }),

    onMutate: (content) => {
      const snapshot = [...messages]
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      appendMessage(userMsg)
      setStreaming(true)
      return { snapshot }
    },

    onSuccess: (data, _vars, _ctx) => {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        bookingStatus: data.booking_status,
      }
      appendMessage(assistantMsg)
      setStreaming(false)

      if (data.booking_status.booking_context) {
        setBookingContext(data.booking_status.booking_context)
      }
      if (data.booking_status.booking_confirmed) {
        qc.invalidateQueries({ queryKey: ['bookings'] })
      }
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) rollbackTo(context.snapshot)
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
        isError: true,
      }
      appendMessage(errMsg)
      setStreaming(false)
    },
  })
}

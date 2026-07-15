import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { chatApi } from '../services/chatApi'
import { useChatStore } from '../store/chatStore'
import type { Message } from '../types/chat'

export function useChatHistory(threadId: string) {
  const { prependHistory, setBookingContext } = useChatStore()

  const query = useQuery({
    queryKey: ['chat', 'history', threadId],
    queryFn: () => chatApi.getHistory(threadId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!query.data) return
    const msgs: Message[] = query.data.messages.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(),
    }))
    if (msgs.length) prependHistory(msgs)
    if (query.data.booking_context) {
      setBookingContext(query.data.booking_context)
    }
  }, [query.data])

  return query
}

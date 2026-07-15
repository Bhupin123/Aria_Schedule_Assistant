import api from './api'
import type { ChatRequest, ChatResponse, HistoryResponse } from '../types/chat'

export const chatApi = {
  sendMessage: async (payload: ChatRequest): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>('/api/v1/chat/messages', payload)
    return data
  },

  getHistory: async (threadId: string): Promise<HistoryResponse> => {
    const { data } = await api.get<HistoryResponse>(`/api/v1/chat/threads/${threadId}/history`)
    return data
  },

  createThread: async (): Promise<string> => {
    const { data } = await api.post<{ thread_id: string }>('/api/v1/chat/threads')
    return data.thread_id
  },
}

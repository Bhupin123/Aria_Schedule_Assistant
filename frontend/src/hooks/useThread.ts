import { useState, useCallback } from 'react'
import { threadUtils } from '../utils/threadUtils'
import { useChatStore } from '../store/chatStore'

export function useThread() {
  const [threadId] = useState<string>(threadUtils.getOrCreate)
  const reset = useChatStore((s) => s.reset)

  const newThread = useCallback(() => {
    threadUtils.clear()
    reset()
    window.location.reload()
  }, [reset])

  return { threadId, newThread }
}

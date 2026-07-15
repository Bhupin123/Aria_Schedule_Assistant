import { useThread } from '../hooks/useThread'
import { ChatInterface } from '../components/chat/ChatInterface'

export function ChatPage() {
  const { threadId } = useThread()
  return <ChatInterface threadId={threadId} />
}

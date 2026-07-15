import { useChatStore } from '../../store/chatStore'
import { useSendMessage } from '../../hooks/useSendMessage'
import { useChatHistory } from '../../hooks/useChatHistory'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface Props {
  threadId: string
}

export function ChatInterface({ threadId }: Props) {
  useChatHistory(threadId)

  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const { mutate: sendMessage } = useSendMessage(threadId)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <MessageList messages={messages} isStreaming={isStreaming} />
      <MessageInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}

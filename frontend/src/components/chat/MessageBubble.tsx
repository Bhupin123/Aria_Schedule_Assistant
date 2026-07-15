import { cn } from '../../utils/cn'
import { BookingStatusCard } from './BookingStatusCard'
import type { Message } from '../../types/chat'

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-end gap-2 mb-4', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
          isUser ? 'bg-gray-300 text-gray-700' : 'bg-brand-600 text-white',
        )}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[78%]', isUser && 'items-end')}>
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
            isUser
              ? 'bg-brand-600 text-white rounded-br-sm'
              : message.isError
              ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.bookingStatus && (
          <BookingStatusCard status={message.bookingStatus} />
        )}
      </div>
    </div>
  )
}

import { useState, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '../../utils/cn'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 max-w-5xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'placeholder:text-gray-400 transition-colors',
            disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
            disabled || !value.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-600 text-white hover:bg-brand-700',
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

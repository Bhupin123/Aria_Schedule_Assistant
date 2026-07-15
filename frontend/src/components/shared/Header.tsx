import { Link, useLocation } from 'react-router-dom'
import { CalendarCheck, MessageSquare, BookOpen, Plus } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useThread } from '../../hooks/useThread'

export function Header() {
  const { pathname } = useLocation()
  const { newThread } = useThread()

  const nav = [
    { to: '/', label: 'Home' },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/bookings', label: 'Bookings', icon: BookOpen },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-600">
          <CalendarCheck className="w-5 h-5" />
          <span>ScheduleAI</span>
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              )}
            >
              {label}
            </Link>
          ))}

          {pathname === '/chat' && (
            <button
              onClick={newThread}
              className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

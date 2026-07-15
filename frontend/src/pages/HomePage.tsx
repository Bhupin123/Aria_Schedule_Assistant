import { Link } from 'react-router-dom'
import { CalendarCheck, MessageSquare, Zap, Shield } from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'Conversational Booking',
    desc: 'Book appointments by simply chatting. No forms, no friction.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Date Parsing',
    desc: '"Tomorrow at 2pm" or "next Monday morning" — we understand it all.',
  },
  {
    icon: Zap,
    title: 'Instant Confirmation',
    desc: 'Slots are reserved in real time with email confirmation sent immediately.',
  },
  {
    icon: Shield,
    title: 'Context-Aware',
    desc: 'Pick up where you left off — your conversation is remembered across sessions.',
  },
]

export function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          AI-powered scheduling
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Book appointments <br />
          <span className="text-brand-600">by just chatting</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mx-auto mb-8">
          No clicking through calendars. Tell our AI assistant when you want to meet,
          and it handles everything else.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/chat"
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-md"
          >
            Start booking →
          </Link>
          <Link
            to="/bookings"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            View my bookings
          </Link>
        </div>
      </div>

      {/* Chat preview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-16 max-w-lg mx-auto">
        <div className="space-y-4">
          {[
            { role: 'user', text: 'I want to book an appointment for next Friday at 3pm' },
            { role: 'ai', text: "Great! I'll check availability for next Friday at 3pm. What's your email address?" },
            { role: 'user', text: 'jane@example.com' },
            { role: 'ai', text: '✓ Booked! Friday Jan 24 at 3:00 PM. Confirmation sent to jane@example.com.' },
          ].map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

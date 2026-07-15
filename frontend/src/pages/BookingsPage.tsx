import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useBookings } from '../hooks/useBookings'
import { BookingCard } from '../components/booking/BookingCard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { EmptyState } from '../components/shared/EmptyState'

const STATUS_OPTIONS = ['', 'confirmed', 'cancelled']

export function BookingsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')

  const { data, isLoading, isError } = useBookings({
    page,
    status: status || undefined,
    email: email || undefined,
  })

  const handleEmailSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setEmail(emailInput)
    setPage(1)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleEmailSearch} className="flex gap-2">
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Filter by email"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
            Search
          </button>
          {email && (
            <button type="button" onClick={() => { setEmail(''); setEmailInput(''); setPage(1) }} className="text-xs text-gray-400 hover:text-gray-700 underline">
              Clear
            </button>
          )}
        </form>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && <p className="text-center text-red-500 text-sm">Failed to load bookings.</p>}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No bookings found"
          description="Your confirmed appointments will appear here."
          action={{ label: 'Book an appointment', to: '/chat' }}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3 mb-6">
            {data.items.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {data.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

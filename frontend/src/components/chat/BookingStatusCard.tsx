import { CheckCircle, Calendar, Clock, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BookingStatus } from '../../types/chat'
import { formatDate, formatTime } from '../../utils/dateUtils'

export function BookingStatusCard({ status }: { status: BookingStatus }) {
  if (!status.booking_confirmed || !status.booking_context) return null

  const { booking_id, normalized_date, normalized_time, email } = status.booking_context

  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-800">Booking Confirmed</span>
      </div>
      <div className="space-y-1.5 text-sm text-green-700">
        {normalized_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(normalized_date)}</span>
          </div>
        )}
        {normalized_time && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatTime(normalized_time)}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{email}</span>
          </div>
        )}
      </div>
      {booking_id && (
        <Link
          to={`/bookings/${booking_id}`}
          className="mt-3 inline-block text-xs text-green-700 underline hover:text-green-900"
        >
          View booking details →
        </Link>
      )}
    </div>
  )
}

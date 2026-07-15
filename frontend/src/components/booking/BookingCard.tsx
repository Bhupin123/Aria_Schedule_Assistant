import { Link } from 'react-router-dom'
import { Calendar, Clock, Mail, ChevronRight } from 'lucide-react'
import type { Booking } from '../../types/booking'
import { BookingStatusBadge } from './BookingStatusBadge'
import { formatDate, formatTime } from '../../utils/dateUtils'

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-800">{formatDate(booking.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{formatTime(booking.booking_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{booking.email}</span>
          </div>
          {booking.purpose && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{booking.purpose}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition-colors" />
        </div>
      </div>
    </Link>
  )
}

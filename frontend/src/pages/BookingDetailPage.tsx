import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Mail, FileText } from 'lucide-react'
import { useBookingDetail, useCancelBooking } from '../hooks/useBookings'
import { BookingStatusBadge } from '../components/booking/BookingStatusBadge'
import { CancelDialog } from '../components/booking/CancelDialog'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { formatDate, formatTime } from '../utils/dateUtils'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showCancel, setShowCancel] = useState(false)
  const { data: booking, isLoading, isError } = useBookingDetail(id!)
  const { mutate: cancel, isPending } = useCancelBooking()

  if (isLoading) return <LoadingSpinner />
  if (isError || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-red-500 mb-4">Booking not found.</p>
        <Link to="/bookings" className="text-brand-600 underline text-sm">Back to bookings</Link>
      </div>
    )
  }

  const handleCancel = (reason?: string) => {
    cancel(
      { id: booking.id, reason },
      {
        onSuccess: () => { setShowCancel(false); navigate('/bookings') },
      },
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/bookings" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to bookings
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Booking Details</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="space-y-4 mb-6">
          <Row icon={Calendar} label="Date" value={formatDate(booking.booking_date)} />
          <Row icon={Clock} label="Time" value={formatTime(booking.booking_time)} />
          <Row icon={Mail} label="Email" value={booking.email} />
          {booking.purpose && <Row icon={FileText} label="Purpose" value={booking.purpose} />}
        </div>

        <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 space-y-1">
          <p>Booking ID: {booking.id}</p>
          <p>Booked: {new Date(booking.created_at).toLocaleDateString()}</p>
          {booking.cancelled_reason && (
            <p className="text-red-400">Cancellation reason: {booking.cancelled_reason}</p>
          )}
        </div>

        {booking.status === 'confirmed' && (
          <button
            onClick={() => setShowCancel(true)}
            className="mt-6 w-full py-2.5 border border-red-300 text-red-600 text-sm rounded-xl hover:bg-red-50 transition-colors"
          >
            Cancel booking
          </button>
        )}
      </div>

      {showCancel && (
        <CancelDialog
          onConfirm={handleCancel}
          onClose={() => setShowCancel(false)}
          isPending={isPending}
        />
      )}
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}

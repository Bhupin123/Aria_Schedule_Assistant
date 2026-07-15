import { cn } from '../../utils/cn'

const styles: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
}

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', styles[status] ?? 'bg-gray-100 text-gray-700')}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

import { format, parseISO } from 'date-fns'

export const formatDate = (d: string) => format(parseISO(d), 'MMMM d, yyyy')

export const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m)
  return format(date, 'h:mm a')
}

export const formatDateTime = (date: string, time: string) =>
  `${formatDate(date)} at ${formatTime(time)}`

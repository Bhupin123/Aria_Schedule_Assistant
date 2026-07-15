import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-brand-600 mb-4">404</h1>
      <p className="text-gray-500 mb-6">Page not found.</p>
      <Link to="/" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
        Go home
      </Link>
    </div>
  )
}

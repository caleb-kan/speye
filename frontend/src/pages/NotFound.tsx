import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <p className="text-base text-text mb-1">Page not found</p>
        <p className="text-sm text-text-secondary mb-4">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/home"
          className="inline-block px-4 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

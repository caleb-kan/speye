import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-text mb-2">Page not found</p>
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/home"
          className="px-6 py-3 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}

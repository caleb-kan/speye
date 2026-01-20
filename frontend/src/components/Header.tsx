import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 p-4">
      <Link
        to="/home"
        className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded"
      >
        sp(eye)
      </Link>
    </header>
  )
}

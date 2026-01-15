import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]">
      <div className="px-16 py-10">
        <Link
          to="/home"
          className="text-2xl font-bold text-[var(--color-primary)] hover:opacity-80 transition-opacity tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded"
        >
          sp(eye)
        </Link>
      </div>
    </header>
  )
}

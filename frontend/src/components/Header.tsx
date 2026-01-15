import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]">
      <div className="px-16 py-10 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold text-[var(--color-primary)] hover:opacity-80 transition-opacity tracking-tight"
        >
          sp(eye)
        </Link>

        <Link
          to="/settings"
          className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          settings
        </Link>
      </div>
    </header>
  )
}

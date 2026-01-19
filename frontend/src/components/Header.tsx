import { Link, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleAuthClick = async () => {
    if (user) {
      await signOut()
      navigate('/home')
    } else {
      navigate('/login')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg">
      <div className="px-16 py-10 flex items-center justify-between">
        <Link
          to="/home"
          className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded"
        >
          sp(eye)
        </Link>

        <button
          onClick={handleAuthClick}
          className="inline-flex items-center gap-2 rounded-full border border-text-secondary/30 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg transition-colors"
          aria-label={user ? 'Log out' : 'Log in'}
        >
          <User size={18} />
          <span>{user ? 'Log out' : 'Log in'}</span>
        </button>
      </div>
    </header>
  )
}

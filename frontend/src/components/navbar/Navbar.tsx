import { NavItem } from './NavItem'
import { Home, BookOpen, Settings } from 'lucide-react'

export function Navbar() {
  return (
    <nav
      className="
        fixed left-4 top-1/2 -translate-y-1/2
        flex flex-col items-center gap-8
        px-4 py-6
        bg-bg-secondary/80 backdrop-blur-md
        rounded-3xl
        shadow-md
      "
      aria-label="Main navigation"
    >
      <NavItem to="/home" icon={<Home size={48} />} label="Home" />
      <NavItem to="/library" icon={<BookOpen size={48} />} label="Library" />
      <NavItem to="/settings" icon={<Settings size={48} />} label="Settings" />
    </nav>
  )
}

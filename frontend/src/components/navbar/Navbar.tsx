import NavItem from './NavItem'
import { Home, BookOpen, Settings } from 'lucide-react'

const Navbar = () => {
  return (
    <nav
      className="
        fixed left-4 top-1/2 -translate-y-1/2
        flex flex-col items-center gap-8
        px-4 py-6
        bg-white/10 backdrop-blur-md
        rounded-3xl
        shadow-md
      "
    >
      <NavItem to="/" icon={<Home size={48} />} />
      <NavItem to="/" icon={<BookOpen size={48} />} />
      <NavItem to="/settings" icon={<Settings size={48} />} />
    </nav>
  )
}

export default Navbar

import { Link, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

type NavItemProps = {
  to: string
  icon: ReactNode
}

const NavItem = ({ to, icon }: NavItemProps) => {
  // Give access to the current URL path
  const location = useLocation()

  // Highlight active navigation item
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`
        flex justify-center items-center
        w-full h-12
        rounded-full transition-colors
        ${isActive ? "text-white" : "text-gray-400 hover:text-white"}
      `}
    >
      {icon}
    </Link>
  )
}

export default NavItem

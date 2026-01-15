import { Navbar } from '../components/navbar/Navbar'
import { Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Left sidebar */}
      <Navbar />

      {/* Main content area */}
      <main className="flex-1 ml-20 p-8">
        <Outlet />
      </main>
    </div>
  )
}

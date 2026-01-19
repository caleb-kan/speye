import { Navbar } from '../components/navbar/Navbar'
import { Header } from '../components/Header'
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Left sidebar */}
      <Navbar />

      {/* Right content shell */}
      <div className="flex-1 ml-20 flex flex-col">
        {/* Top header (global) */}
        <Header />

        <div className="h-20" />

        {/* Page content */}
        <main className="flex-1 flex flex-col px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Navbar } from '../components/navbar/Navbar'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      {/* Left sidebar */}
      <Navbar />

      {/* Right content shell */}
      <div className="flex-1 ml-14 flex flex-col">
        {/* Top header (global) */}
        <Header />

        <div className="h-12" />

        {/* Page content */}
        <main className="relative flex-1 flex flex-col min-h-0">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}

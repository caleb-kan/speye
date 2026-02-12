import { Navbar } from '../components/navbar/Navbar'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { NotificationToaster } from '../components/notifications/NotificationToaster'
import { NotificationsMailButton } from '../components/notifications/NotificationsMailButton'
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      {/* Fixed overlays */}
      <Navbar />
      <Header />
      <NotificationsMailButton />
      <NotificationToaster />

      {/* Right content shell */}
      <div className="flex-1 ml-14 flex flex-col">
        {/* Page content */}
        <main className="relative flex-1 flex flex-col min-h-0 overflow-auto pt-12">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}

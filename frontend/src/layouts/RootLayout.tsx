import { Navbar } from '../components/navbar/Navbar'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { NotificationToaster } from '../components/notifications/NotificationToaster'
import { NotificationsMailButton } from '../components/notifications/NotificationsMailButton'
import { OfflineIndicator } from '../components/ui/OfflineIndicator'
import { Outlet } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'

export function RootLayout() {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-text">
      {/* Fixed overlays */}
      <Navbar />
      <Header />
      <NotificationsMailButton />
      <NotificationToaster />
      <OfflineIndicator />

      {/* Right content shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Page content */}
        <main
          className={`relative flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden ${
            isMobile ? 'pt-11' : 'pt-12'
          }`}
        >
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}

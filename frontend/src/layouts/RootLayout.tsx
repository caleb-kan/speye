import { useState } from 'react'
import { Navbar } from '../components/navbar/Navbar'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { NotificationToaster } from '../components/notifications/NotificationToaster'
import { NotificationsMailButton } from '../components/notifications/NotificationsMailButton'
import { OfflineIndicator } from '../components/ui/OfflineIndicator'
import { PwaInstallBanner } from '../components/ui/PwaInstallBanner'
import { Outlet, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { isMobileDevice } from '../utils/isMobileDevice'
import { isPwaStandalone } from '../utils/isPwaStandalone'
import { STORAGE_KEYS } from '../constants/storage'
import { ROUTES } from '../utils/routes'

function shouldShowBanner(): boolean {
  try {
    const dismissed =
      localStorage.getItem(STORAGE_KEYS.PWA_BANNER_DISMISSED) === '1'
    return isMobileDevice() && !isPwaStandalone() && !dismissed
  } catch {
    return false
  }
}

export function RootLayout() {
  const isMobile = useIsMobile()
  const location = useLocation()
  const [bannerVisible, setBannerVisible] = useState(shouldShowBanner)

  const showBanner =
    bannerVisible && isMobile && location.pathname === ROUTES.RSVP

  function handleBannerDismiss() {
    try {
      localStorage.setItem(STORAGE_KEYS.PWA_BANNER_DISMISSED, '1')
    } catch {
      // Persistence failed; banner hides for this session only
    }
    setBannerVisible(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-text">
      {/* Fixed overlays */}
      <Navbar />
      <Header />
      <NotificationsMailButton />
      <NotificationToaster />
      <OfflineIndicator />
      {showBanner && <PwaInstallBanner onDismiss={handleBannerDismiss} />}

      {/* Right content shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Page content */}
        <main
          className={`relative flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden ${
            isMobile ? 'pt-11' : 'pt-12'
          } ${showBanner ? 'pb-11' : ''}`}
        >
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}

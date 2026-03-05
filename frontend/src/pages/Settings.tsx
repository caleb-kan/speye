import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { ThemeSection } from '../components/settings/ThemeSection'
import { ShortcutsSection } from '../components/settings/ShortcutsSection'
import { AboutSection } from '../components/settings/AboutSection'
import { OfflineCacheSection } from '../components/settings/OfflineCacheSection'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../hooks/useAuth'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()
  const { user } = useAuth()
  const { hash } = useLocation()

  // Scroll to hash fragment (e.g. #offline-cache) after mount
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  const isMobile = useIsMobile()
  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-8 p-6">
      <div className="w-full max-w-xl">
        <ThemeSection theme={theme} themes={themes} onThemeChange={setTheme} />

        <AboutSection />

        {!isMobile && <ShortcutsSection />}

        {user && <OfflineCacheSection />}

        <div className="mt-6 pb-2 text-center text-xs text-text-secondary">
          <p>© 2026 sp(eye). All rights reserved</p>
          <div className="mt-1">
            <Link
              to="/terms"
              className="text-xs text-text-secondary hover:underline"
            >
              Terms of Service
            </Link>
            {' · '}
            <Link
              to="/privacy"
              className="text-xs text-text-secondary hover:underline"
            >
              Privacy Policy
            </Link>
            {' · '}
            <Link
              to="/license"
              className="text-xs text-text-secondary hover:underline"
            >
              License
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

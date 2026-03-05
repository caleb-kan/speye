import { useState, useEffect, useCallback } from 'react'
import { ArrowUp, ArrowLeft, ArrowDown, ArrowRight } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'

const SESSION_KEY = 'nav-hints-shown'
const HINT_DURATION_MS = 10_000
const HINT_ICON_SIZE = 14

export function ShortcutHints() {
  const isMobile = useIsMobile()
  const [show, setShow] = useState(() => !sessionStorage.getItem(SESSION_KEY))

  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setShow(false)
  }, [])

  useEffect(() => {
    if (!show || isMobile) return
    const id = setTimeout(dismiss, HINT_DURATION_MS)
    return () => clearTimeout(id)
  }, [show, isMobile, dismiss])

  if (isMobile || !show) return null

  const hintClass =
    'fixed top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none z-40 animate-hint-fade'
  const kbdClass =
    'px-1.5 py-0.5 bg-bg-secondary rounded text-xs text-text-secondary'

  return (
    <>
      <div className={hintClass} style={{ left: '5rem' }}>
        <div className="flex gap-1">
          <kbd className={kbdClass}>
            <ArrowUp size={HINT_ICON_SIZE} className="inline" />
          </kbd>
          <kbd className={kbdClass}>
            <ArrowLeft size={HINT_ICON_SIZE} className="inline" />
          </kbd>
        </div>
        <span className="text-xs text-text-secondary">Jump back</span>
      </div>

      <div
        className={hintClass}
        style={{ right: '2rem' }}
        onAnimationEnd={dismiss}
      >
        <div className="flex gap-1">
          <kbd className={kbdClass}>
            <ArrowDown size={HINT_ICON_SIZE} className="inline" />
          </kbd>
          <kbd className={kbdClass}>
            <ArrowRight size={HINT_ICON_SIZE} className="inline" />
          </kbd>
        </div>
        <span className="text-xs text-text-secondary">Jump forward</span>
      </div>
    </>
  )
}

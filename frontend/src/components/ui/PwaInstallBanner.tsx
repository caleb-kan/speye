import { useState } from 'react'
import { X, Download, Share, SquarePlus, Check } from 'lucide-react'

/**
 * Tailwind spacing unit for the fixed banner height (11 = 2.75rem).
 * Keep in sync with the `pb-11` bottom padding in RootLayout.
 */
const BOTTOM_OFFSET_CLASS = 'bottom-11'

interface PwaInstallBannerProps {
  onDismiss: () => void
}

export function PwaInstallBanner({ onDismiss }: PwaInstallBannerProps) {
  const [popupOpen, setPopupOpen] = useState(false)

  function handleDismiss() {
    setPopupOpen(false)
    onDismiss()
  }

  return (
    <>
      {/* Instructions popup */}
      {popupOpen && (
        <div
          id="pwa-install-popup"
          data-testid="pwa-install-popup"
          className={`fixed ${BOTTOM_OFFSET_CLASS} left-0 right-0 z-50 mx-3 mb-2 rounded-xl bg-bg-secondary border border-text-secondary/20 shadow-xl overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-sm font-semibold text-text">
              How to install sp(eye) as a PWA
            </span>
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              aria-label="Close instructions"
              className="p-1 rounded text-text-secondary hover:text-text hover:bg-text-secondary/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <Step
              number={1}
              icon={<Share className="h-5 w-5 text-primary" />}
              text={
                <>
                  Tap the{' '}
                  <span className="font-medium text-primary">Share</span> button
                  in your browser
                </>
              }
            />
            <Step
              number={2}
              icon={<SquarePlus className="h-5 w-5 text-primary" />}
              text={
                <>
                  Tap{' '}
                  <span className="font-medium text-primary">
                    Add to Home Screen
                  </span>
                </>
              }
            />
            <Step
              number={3}
              icon={<Check className="h-5 w-5 text-primary" />}
              text={
                <>
                  Tap <span className="font-medium text-primary">Add</span> and
                  you're all set!
                </>
              }
            />
          </div>
        </div>
      )}

      {/* Banner */}
      <div
        data-testid="pwa-install-banner"
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-4 px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] bg-bg-secondary/50 backdrop-blur-sm border-t border-text-secondary/20 text-sm shadow-lg"
      >
        <button
          type="button"
          onClick={() => setPopupOpen((o) => !o)}
          className="flex items-center gap-4 flex-1 text-left"
          aria-expanded={popupOpen}
          aria-controls="pwa-install-popup"
        >
          <Download
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="flex-1 text-text">
            Install this app for a better experience
          </span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="shrink-0 rounded text-error hover:text-text hover:bg-text-secondary/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}

interface StepProps {
  number: number
  icon: React.ReactNode
  text: React.ReactNode
}

function Step({ number, icon, text }: StepProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {number}
      </span>
      <div className="flex items-start gap-2 pt-0.5">
        <span className="shrink-0">{icon}</span>
        <p className="text-sm text-text-secondary leading-snug">{text}</p>
      </div>
    </div>
  )
}

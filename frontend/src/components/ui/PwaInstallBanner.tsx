import { useState } from 'react'
import { X, Download, Share, SquarePlus, Check } from 'lucide-react'

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
      {popupOpen && (
        <div
          id="pwa-install-popup"
          data-testid="pwa-install-popup"
          className="fixed bottom-[calc(var(--mobile-navigation-height)+5rem)] left-0 right-0 z-50 mx-3 mb-2 max-h-[60dvh] overflow-y-auto rounded-xl bg-bg-secondary border border-text-secondary/20 shadow-xl"
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

      <div
        data-testid="pwa-install-banner"
        className="fixed bottom-(--mobile-navigation-height) left-0 right-0 z-50 flex items-center gap-4 px-4 py-2.5 bg-bg-secondary/95 backdrop-blur-sm border-t border-text-secondary/20 text-sm shadow-lg"
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
          className="shrink-0 min-w-11 min-h-11 flex items-center justify-center rounded text-error hover:text-text hover:bg-text-secondary/10 transition-colors"
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

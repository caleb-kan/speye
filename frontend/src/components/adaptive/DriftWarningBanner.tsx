import { AlertTriangle, Crosshair, X } from 'lucide-react'
import { Button } from '../ui/Button'

export type DriftWarningBannerProps = {
  onRecalibrate: () => void
  onDismiss: () => void
}

export function DriftWarningBanner({
  onRecalibrate,
  onDismiss,
}: DriftWarningBannerProps) {
  return (
    <div className="mx-4 mt-4 px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-text">
              Eye tracking quality has degraded
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Try: Check lighting | Face the camera | Keep head still
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onRecalibrate}
            className="!px-3 !py-2 text-xs inline-flex items-center whitespace-nowrap"
          >
            <Crosshair className="w-4 h-4 mr-1 shrink-0" />
            Recalibrate
          </Button>
          <button
            onClick={onDismiss}
            className="p-1 text-text-secondary hover:text-text rounded"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

import { AlertCircle } from 'lucide-react'
import type { WebGazerStatus } from '../../../types/adaptive'
import { Button } from '../../ui/Button'
import { FullScreenOverlay } from '../../ui/FullScreenOverlay'

type ErrorConfig = {
  title: string
  message: string
}

const ERROR_CONFIG: Record<string, ErrorConfig> = {
  'permission-denied': {
    title: 'Camera Access Denied',
    message: 'Please allow camera access in your browser settings.',
  },
  'not-supported': {
    title: 'Browser Not Supported',
    message:
      'Your browser does not support eye tracking. Try Chrome, Firefox, or Edge.',
  },
  error: {
    title: 'Eye Tracking Error',
    message: 'An error occurred with eye tracking. Please try again.',
  },
  default: {
    title: 'Calibration Failed',
    message: 'Unable to initialize eye tracking.',
  },
}

type CalibrationFailedProps = {
  webgazerStatus: WebGazerStatus
  webgazerError: string | null
  onRetry: () => void
  onCancel: () => void
}

/**
 * Error screen shown when calibration fails.
 * Provides appropriate messaging based on error type and retry option.
 */
export function CalibrationFailed({
  webgazerStatus,
  webgazerError,
  onRetry,
  onCancel,
}: CalibrationFailedProps) {
  const config = ERROR_CONFIG[webgazerStatus] ?? ERROR_CONFIG.default
  const title = config.title
  const message = webgazerError ?? config.message

  return (
    <FullScreenOverlay>
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>

        <h1 className="text-2xl font-bold text-text mb-4">{title}</h1>

        <p className="text-text-secondary mb-6">{message}</p>

        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={onCancel}>
            Use Standard Mode
          </Button>
          {['permission-denied', 'error'].includes(webgazerStatus) && (
            <Button onClick={onRetry}>Try Again</Button>
          )}
        </div>
      </div>
    </FullScreenOverlay>
  )
}

import type { WebGazerStatus } from '../../../types/adaptive'
import { Spinner } from '../../ui/Spinner'
import { Button } from '../../ui/Button'
import { FullScreenOverlay } from '../../ui/FullScreenOverlay'

type CalibrationLoadingProps = {
  webgazerStatus: WebGazerStatus
  onCancel: () => void
}

/** Loading screen shown while WebGazer is initializing. */
export function CalibrationLoading({
  webgazerStatus,
  onCancel,
}: CalibrationLoadingProps) {
  return (
    <FullScreenOverlay className="p-0">
      <Spinner size="lg" className="mb-4" />
      <p className="text-text-secondary">
        {webgazerStatus === 'idle' && 'Starting eye tracker...'}
        {webgazerStatus === 'initializing' && 'Loading eye tracking models...'}
        {webgazerStatus === 'ready' && 'Almost ready...'}
      </p>
      <p className="text-text-secondary text-sm mt-2">
        {webgazerStatus === 'initializing'
          ? 'This may take a moment on first load'
          : 'Please allow camera access when prompted'}
      </p>
      <Button variant="ghost" onClick={onCancel} className="mt-8">
        Cancel
      </Button>
    </FullScreenOverlay>
  )
}

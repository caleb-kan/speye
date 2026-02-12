import { Camera, ArrowRight } from 'lucide-react'
import type { WebGazerStatus } from '../../../types/adaptive'
import { Button } from '../../ui/Button'
import { FullScreenOverlay } from '../../ui/FullScreenOverlay'

type CalibrationIntroProps = {
  onStart: () => void
  onCancel: () => void
  webgazerStatus: WebGazerStatus
}

/**
 * Introduction screen for eye tracking calibration.
 * Explains the process and provides tips for better accuracy.
 */
export function CalibrationIntro({
  onStart,
  onCancel,
  webgazerStatus,
}: CalibrationIntroProps) {
  return (
    <FullScreenOverlay>
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Camera className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-text mb-4">
          Eye Tracking Setup
        </h1>

        <p className="text-text-secondary mb-6">
          A series of dots will appear on screen. <strong>Look</strong> at each
          dot, then <strong>click</strong> it. Keep your head still and move
          only your eyes.
        </p>

        <div className="bg-bg-secondary rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-text mb-2">Tips:</h3>
          <ul className="text-text-secondary text-sm space-y-1">
            <li>
              <strong>Good lighting</strong> - face a light source, avoid
              backlighting
            </li>
            <li>
              <strong>Look before clicking</strong> - focus on the dot for a
              moment first
            </li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onStart} className="flex items-center gap-2">
            {webgazerStatus === 'ready' ? 'Start Calibration' : 'Enable Camera'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </FullScreenOverlay>
  )
}

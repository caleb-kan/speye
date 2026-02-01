import { Camera, ArrowRight } from 'lucide-react'
import {
  CALIBRATION_CLICKS_PER_POINT,
  CALIBRATION_ACCURACY_THRESHOLD,
} from '../../../constants/calibration'
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
          Horizontal Eye Tracking Calibration
        </h1>

        <p className="text-text-secondary mb-6">
          This reader tracks your eyes moving <strong>left to right</strong> as
          you read. We need to calibrate the eye tracker for accurate horizontal
          tracking.
        </p>

        <div className="bg-bg-secondary rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-text mb-2">How it works:</h3>
          <ol className="list-decimal list-inside text-text-secondary space-y-1 text-sm">
            <li>
              <strong className="text-text">Look</strong> at each point, then{' '}
              <strong className="text-text">click</strong> it (
              {CALIBRATION_CLICKS_PER_POINT} times each)
            </li>
            <li>Stare at the center point to measure accuracy</li>
            <li>
              Accuracy must be at least {CALIBRATION_ACCURACY_THRESHOLD}% to
              continue
            </li>
          </ol>

          <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
            <h4 className="font-medium text-primary text-sm mb-2">
              Tips for better accuracy:
            </h4>
            <ul className="text-text-secondary text-xs space-y-1">
              <li>
                <strong>Keep your head still</strong> - move only your eyes
              </li>
              <li>
                <strong>Good lighting</strong> - face a light source, avoid
                backlighting
              </li>
              <li>
                <strong>Proper distance</strong> - sit about arm&apos;s length
                from screen
              </li>
              <li>
                <strong>Look THEN click</strong> - focus on the point for a
                moment before clicking
              </li>
            </ul>
          </div>
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

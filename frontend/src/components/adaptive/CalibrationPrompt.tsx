import { ArrowRight, Crosshair, Eye } from 'lucide-react'
import { TextTitle } from '../TextTitle'
import { Button } from '../ui/Button'
import { AdaptiveControls } from './AdaptiveControls'

export type CalibrationPromptProps = {
  title: string | null
  source: string | null
  onStartCalibration: () => void
  controlsProps: {
    onRestart: () => void
    onNewText: () => void
    onGoBack: () => void
    onGoForward: () => void
    currentPage: number
    totalPages: number
  }
}

export function CalibrationPrompt({
  title,
  source,
  onStartCalibration,
  controlsProps,
}: CalibrationPromptProps) {
  return (
    <div className="flex flex-col flex-1">
      {title && (
        <div className="pt-8">
          <TextTitle title={title} source={source} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Eye className="w-16 h-16 text-primary" />
              <ArrowRight className="w-6 h-6 text-primary absolute -right-6 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-text mb-4">
            Horizontal Eye Tracking Setup
          </h2>
          <p className="text-text-secondary mb-4">
            This reader tracks your eyes moving <strong>left to right</strong>{' '}
            as you read. When your gaze reaches the end of the line, the next
            chunk appears automatically.
          </p>
          <div className="bg-bg-secondary/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-text-secondary font-medium mb-2">
              How it works:
            </p>
            <ul className="text-sm text-text-secondary/80 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span>Read each chunk from left to right naturally</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span>
                  When your eyes reach the right side, the next chunk appears
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span>You can also use arrow keys for manual control</span>
              </li>
            </ul>
          </div>
          <Button onClick={onStartCalibration}>
            <Crosshair className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            Start Calibration
          </Button>
        </div>
      </div>

      <AdaptiveControls
        {...controlsProps}
        progress={0}
        calculatedWpm={0}
        disabled={true}
      />
    </div>
  )
}

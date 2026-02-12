import { Crosshair, Eye } from 'lucide-react'
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
            <Eye className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-text mb-4">
            Adaptive Reading
          </h2>
          <p className="text-text-secondary mb-6">
            This reader tracks your eyes moving <strong>left to right</strong>.
            When your gaze reaches the end of the line, the next chunk appears
            automatically. You can also use arrow keys for manual control.
          </p>
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

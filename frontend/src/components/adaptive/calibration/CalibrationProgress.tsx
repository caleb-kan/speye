import { CalibrationPoint } from '../CalibrationPoint'
import { ReadingAreaContainer } from '../ReadingAreaContainer'
import type { CalibrationPointState } from '../../../types/adaptive'
import { CALIBRATION_INSTRUCTION_FONT_SIZE } from '../../../constants/calibration'
import { Z_INDEX } from '../../../constants/ui'

type CalibrationProgressProps = {
  points: CalibrationPointState[]
  currentPointIndex: number
  totalPoints: number
  readingAreaRef: React.RefObject<HTMLDivElement | null>
  onPointClick: () => void
  onCancel: () => void
}

/**
 * Active calibration screen with calibration points.
 * User clicks on each point while looking at it to train the eye tracker.
 */
export function CalibrationProgress({
  points,
  currentPointIndex,
  totalPoints,
  readingAreaRef,
  onPointClick,
  onCancel,
}: CalibrationProgressProps) {
  const currentPoint = points[currentPointIndex]
  const completedCount = points.filter((p) => p.isComplete).length

  return (
    <>
      {/* Fixed overlay to cover navbar and header */}
      <div
        className="fixed inset-0 bg-bg pointer-events-none"
        style={{ zIndex: Z_INDEX.CALIBRATION_OVERLAY }}
      />

      <div
        className="flex flex-col flex-1 min-h-0 overflow-x-visible overflow-y-hidden relative"
        style={{ zIndex: Z_INDEX.CALIBRATION_CONTENT }}
      >
        {/* Title section */}
        <div className="pt-8 shrink-0">
          <h2 className="text-2xl font-semibold text-center text-text">
            Horizontal Calibration
          </h2>
          <p className="text-center text-text-secondary text-sm mt-2">
            Training eye tracker for left-to-right reading
          </p>
          <p className="text-center text-text-secondary/60 text-xs mt-1">
            The red dot shows the tracker&apos;s prediction. It may seem off at
            first but will improve with each click.
          </p>
        </div>

        {/* Reading area - uses shared container for consistent positioning */}
        <ReadingAreaContainer ref={readingAreaRef} variant="calibration">
          <p
            className="text-text-secondary/40 text-center font-medium select-none"
            style={{ fontSize: CALIBRATION_INSTRUCTION_FONT_SIZE }}
          >
            Calibration points will appear in this reading area
          </p>
        </ReadingAreaContainer>

        {/* Calibration points - use fixed positioning */}
        {points.length > 0 &&
          points.map((point, index) => (
            <CalibrationPoint
              key={point.id}
              x={point.x}
              y={point.y}
              clicksRemaining={point.clicksRemaining}
              isActive={index === currentPointIndex}
              isComplete={point.isComplete}
              onClick={onPointClick}
            />
          ))}

        {/* Progress indicator */}
        <div className="py-4 px-8 shrink-0">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-primary font-medium text-sm">
                Look at the point, then click
              </p>
              <p className="text-text-secondary text-xs mt-1">
                {currentPoint ? (
                  <>
                    Point {currentPointIndex + 1} of {totalPoints} (
                    {currentPoint.clicksRemaining} click
                    {currentPoint.clicksRemaining !== 1 ? 's' : ''} left)
                  </>
                ) : (
                  'Measuring reading area...'
                )}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-32">
              <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(completedCount / totalPoints) * 100}%`,
                  }}
                />
              </div>
            </div>
            {/* Cancel button */}
            <button
              onClick={onCancel}
              className="text-text-secondary hover:text-text text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

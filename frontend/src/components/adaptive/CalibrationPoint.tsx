import { useMemo } from 'react'
import {
  CALIBRATION_CLICKS_PER_POINT,
  CALIBRATION_POINT_SIZE,
  CALIBRATION_POINT_INNER_SIZE,
  CALIBRATION_POINT_SHRINK_FACTOR,
  CALIBRATION_POINT_BASE_OPACITY,
  CALIBRATION_UPCOMING_SIZE_FACTOR,
  CALIBRATION_UPCOMING_OPACITY,
  CHECKMARK_STROKE_WIDTH,
} from '../../constants/calibration'
import { CALIBRATION_POINT_TRANSITION_MS } from '../../constants/adaptive'
import { Z_INDEX } from '../../constants/ui'

type PointStyle = {
  size: number
  backgroundColor: string
  opacity: number
}

/** Calculate point visual properties based on its state */
function getPointStyle(
  isComplete: boolean,
  isUpcoming: boolean,
  currentSize: number,
  currentOpacity: number
): PointStyle {
  if (isComplete) {
    return {
      size: CALIBRATION_POINT_INNER_SIZE * 2,
      backgroundColor: 'var(--color-success)',
      opacity: 1,
    }
  }
  if (isUpcoming) {
    return {
      size: CALIBRATION_POINT_SIZE * CALIBRATION_UPCOMING_SIZE_FACTOR,
      backgroundColor: 'var(--color-text-secondary)',
      opacity: CALIBRATION_UPCOMING_OPACITY,
    }
  }
  return {
    size: currentSize,
    backgroundColor: 'var(--color-primary)',
    opacity: currentOpacity,
  }
}

type CalibrationPointProps = {
  /** X position in pixels */
  x: number
  /** Y position in pixels */
  y: number
  /** Number of clicks remaining */
  clicksRemaining: number
  /** Whether this point is currently active */
  isActive: boolean
  /** Whether this point is complete */
  isComplete: boolean
  /** Called when point is clicked */
  onClick: () => void
}

export function CalibrationPoint({
  x,
  y,
  clicksRemaining,
  isActive,
  isComplete,
  onClick,
}: CalibrationPointProps) {
  const isUpcoming = !isActive && !isComplete

  const pointStyle = useMemo(() => {
    const progress = 1 - clicksRemaining / CALIBRATION_CLICKS_PER_POINT
    const currentSize =
      CALIBRATION_POINT_SIZE -
      progress * (CALIBRATION_POINT_SIZE * CALIBRATION_POINT_SHRINK_FACTOR)
    const currentOpacity =
      CALIBRATION_POINT_BASE_OPACITY +
      progress * (1 - CALIBRATION_POINT_BASE_OPACITY)
    return getPointStyle(isComplete, isUpcoming, currentSize, currentOpacity)
  }, [clicksRemaining, isComplete, isUpcoming])

  return (
    <button
      onClick={onClick}
      disabled={isComplete || !isActive}
      className={`
        fixed transform -translate-x-1/2 -translate-y-1/2
        flex items-center justify-center
        rounded-full
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isActive && !isComplete ? 'cursor-pointer animate-pulse' : 'cursor-default'}
      `}
      style={{
        left: x,
        top: y,
        width: pointStyle.size,
        height: pointStyle.size,
        backgroundColor: pointStyle.backgroundColor,
        opacity: pointStyle.opacity,
        zIndex: Z_INDEX.CALIBRATION_POINT,
        transition: `all ${CALIBRATION_POINT_TRANSITION_MS}ms`,
      }}
      aria-label={
        isComplete
          ? 'Calibration point complete'
          : isUpcoming
            ? 'Upcoming calibration point'
            : `Click calibration point (${clicksRemaining} clicks remaining)`
      }
    >
      {isActive && !isComplete && (
        <div
          className="rounded-full bg-bg"
          style={{
            width: CALIBRATION_POINT_INNER_SIZE,
            height: CALIBRATION_POINT_INNER_SIZE,
          }}
        />
      )}

      {isComplete && (
        <svg
          className="w-3 h-3 text-bg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={CHECKMARK_STROKE_WIDTH}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  )
}

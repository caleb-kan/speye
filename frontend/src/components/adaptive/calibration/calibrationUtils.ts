import {
  getTextAreaBounds,
  getPositionInTextArea,
} from '../../../utils/coordinateSystem'
import {
  CALIBRATION_HORIZONTAL_POSITIONS,
  CALIBRATION_SUPPLEMENTAL_X_POSITIONS,
  CALIBRATION_VERTICAL_TOP_FACTOR,
  CALIBRATION_VERTICAL_BOTTOM_FACTOR,
  MIN_CALIBRATION_AREA_WIDTH,
} from '../../../constants/calibration'

/**
 * Fisher-Yates shuffle for randomizing calibration point order.
 * Randomization prevents users from learning a predictable click pattern,
 * which could lead to "muscle memory" calibration where the mouse moves
 * ahead of the eyes. Random order forces genuine eye-following behavior.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Calculate calibration point positions within the text area.
 *
 * Uses two groups of points for robust horizontal tracking:
 * - Main points (5): Evenly spaced across horizontal axis at center height,
 *   matching the single-line reading position
 * - Supplemental points (4): Above and below center at key positions,
 *   improving regression model accuracy for minor vertical gaze drift
 */
export function calculateCalibrationPoints(
  containerRect: DOMRect
): Array<{ x: number; y: number }> {
  const textAreaBounds = getTextAreaBounds(containerRect)
  if (!textAreaBounds || textAreaBounds.width < MIN_CALIBRATION_AREA_WIDTH) {
    return []
  }

  const mainPoints = CALIBRATION_HORIZONTAL_POSITIONS.map((xPercent) =>
    getPositionInTextArea(textAreaBounds, xPercent, 0.5)
  )

  const supplementalPoints = CALIBRATION_SUPPLEMENTAL_X_POSITIONS.flatMap(
    (xPercent) => [
      getPositionInTextArea(
        textAreaBounds,
        xPercent,
        CALIBRATION_VERTICAL_TOP_FACTOR
      ),
      getPositionInTextArea(
        textAreaBounds,
        xPercent,
        CALIBRATION_VERTICAL_BOTTOM_FACTOR
      ),
    ]
  )

  return shuffleArray([...mainPoints, ...supplementalPoints])
}

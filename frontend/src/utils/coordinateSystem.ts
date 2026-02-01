/**
 * Coordinate system for adaptive reading calibration and gaze tracking.
 * Provides consistent bounds calculations for the text area (content minus padding).
 */

import { TEXT_CONTAINER_PADDING_X } from '../constants/adaptive'

export interface TextAreaBounds {
  left: number
  right: number
  width: number
  centerX: number
  centerY: number
  top: number
  height: number
}

/** Calculate text area bounds (content minus padding) from a container's DOMRect. */
export function getTextAreaBounds(
  containerRect: DOMRect | null
): TextAreaBounds | null {
  if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) {
    return null
  }

  const textAreaLeft = containerRect.left + TEXT_CONTAINER_PADDING_X
  const textAreaRight = containerRect.right - TEXT_CONTAINER_PADDING_X
  const textAreaWidth = textAreaRight - textAreaLeft

  if (textAreaWidth <= 0) {
    return null
  }

  return {
    left: textAreaLeft,
    right: textAreaRight,
    width: textAreaWidth,
    centerX: textAreaLeft + textAreaWidth / 2,
    centerY: containerRect.top + containerRect.height / 2,
    top: containerRect.top,
    height: containerRect.height,
  }
}

/** Get the center position of the text area for accuracy testing. */
export function getAccuracyTargetPosition(
  containerRect: DOMRect | null
): { x: number; y: number } | null {
  const bounds = getTextAreaBounds(containerRect)
  if (!bounds) {
    return null
  }

  return {
    x: bounds.centerX,
    y: bounds.centerY,
  }
}

/** Get screen coordinates for a position within the text area. */
export function getPositionInTextArea(
  textAreaBounds: TextAreaBounds,
  xPercent: number,
  yPercent: number = 0.5
): { x: number; y: number } {
  return {
    x: textAreaBounds.left + textAreaBounds.width * xPercent,
    y: textAreaBounds.top + textAreaBounds.height * yPercent,
  }
}

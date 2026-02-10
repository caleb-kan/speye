import { useEffect, useMemo } from 'react'
import {
  MIN_TEXT_FILL_RATIO,
  SINGLE_LINE_FONT_SIZE,
  SINGLE_LINE_FONT_WEIGHT,
  SINGLE_LINE_LINE_HEIGHT,
} from '../constants/adaptive'

export type UseTextFillRatioParams = {
  currentText: string
  availableWidth: number
  fontFamily: string
  onTextFillRatioMeasured?: (ratio: number) => void
}

const measureTextWidth = (text: string, fontFamily: string): number => {
  const measureSpan = document.createElement('span')
  measureSpan.style.visibility = 'hidden'
  measureSpan.style.position = 'absolute'
  measureSpan.style.whiteSpace = 'nowrap'
  measureSpan.style.fontWeight = String(SINGLE_LINE_FONT_WEIGHT)
  measureSpan.style.fontFamily = fontFamily
  measureSpan.style.fontSize = `${SINGLE_LINE_FONT_SIZE}px`
  measureSpan.style.lineHeight = String(SINGLE_LINE_LINE_HEIGHT)
  measureSpan.textContent = text
  document.body.appendChild(measureSpan)

  const textWidth = measureSpan.offsetWidth
  document.body.removeChild(measureSpan)

  return textWidth
}

export const useTextFillRatio = (params: UseTextFillRatioParams): number => {
  const { currentText, availableWidth, fontFamily, onTextFillRatioMeasured } =
    params

  const textFillRatio = useMemo((): number => {
    if (availableWidth <= 0 || !currentText) {
      return 1
    }

    const textWidth = measureTextWidth(currentText, fontFamily)

    return Math.min(
      1,
      Math.max(MIN_TEXT_FILL_RATIO, textWidth / availableWidth)
    )
  }, [availableWidth, currentText, fontFamily])

  useEffect(() => {
    onTextFillRatioMeasured?.(textFillRatio)
  }, [onTextFillRatioMeasured, textFillRatio])

  return textFillRatio
}

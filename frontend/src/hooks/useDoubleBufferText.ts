import { useMemo } from 'react'
import { usePrevious } from './usePrevious'

export type DoubleBufferState = {
  activeBuffer: 'A' | 'B'
  bufferAText: string
  bufferBText: string
}

export type UseDoubleBufferTextParams = {
  currentText: string
  currentChunk: number
  resetKey: string
}

export const useDoubleBufferText = (
  params: UseDoubleBufferTextParams
): DoubleBufferState => {
  const { currentText, currentChunk, resetKey } = params
  const previousText = usePrevious(currentText)
  const previousResetKey = usePrevious(resetKey)

  const shouldReset =
    previousResetKey !== undefined && previousResetKey !== resetKey

  const activeBuffer = shouldReset ? 'A' : currentChunk % 2 === 0 ? 'A' : 'B'

  const fallbackText = shouldReset ? currentText : (previousText ?? currentText)

  const bufferAText = useMemo(() => {
    return activeBuffer === 'A' ? currentText : fallbackText
  }, [activeBuffer, currentText, fallbackText])

  const bufferBText = useMemo(() => {
    return activeBuffer === 'B' ? currentText : fallbackText
  }, [activeBuffer, currentText, fallbackText])

  return { activeBuffer, bufferAText, bufferBText }
}

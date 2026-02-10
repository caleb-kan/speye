import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FONT_FAMILY } from '../constants/adaptive'
import { getTextAreaBounds } from '../utils/coordinateSystem'
import {
  splitTextToFitWidthWithMetadata,
  type ChunkData,
} from '../utils/textChunking'
import { useResizeObserverWithRef } from './useResizeObserver'

export type UseTextChunksParams = {
  text: string
  containerRef: RefObject<HTMLDivElement | null>
  onContainerMeasured?: (left: number, width: number) => void
  onTotalChunksCalculated?: (totalChunks: number) => void
  onChunkWordCounts?: (wordCounts: number[]) => void
}

export type UseTextChunksResult = {
  chunks: ChunkData[]
  availableWidth: number
  fontFamily: string
}

export const useTextChunks = (
  params: UseTextChunksParams
): UseTextChunksResult => {
  const {
    text,
    containerRef,
    onContainerMeasured,
    onTotalChunksCalculated,
    onChunkWordCounts,
  } = params
  const [availableWidth, setAvailableWidth] = useState(0)
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY)
  const lastMeasurementsRef = useRef({ left: 0, width: 0 })

  const handleResize = useCallback(
    (rect: DOMRect) => {
      const textAreaBounds = getTextAreaBounds(rect)
      if (!textAreaBounds) return

      setAvailableWidth(textAreaBounds.width)

      const container = containerRef.current
      if (container) {
        const computedStyle = window.getComputedStyle(container)
        const nextFontFamily = computedStyle.fontFamily || DEFAULT_FONT_FAMILY
        setFontFamily(nextFontFamily)
      }

      const last = lastMeasurementsRef.current
      if (
        textAreaBounds.left !== last.left ||
        textAreaBounds.width !== last.width
      ) {
        lastMeasurementsRef.current = {
          left: textAreaBounds.left,
          width: textAreaBounds.width,
        }
        onContainerMeasured?.(textAreaBounds.left, textAreaBounds.width)
      }
    },
    [containerRef, onContainerMeasured]
  )

  useResizeObserverWithRef(containerRef, handleResize)

  const chunks = useMemo((): ChunkData[] => {
    if (availableWidth <= 0 || !text) {
      return []
    }

    return splitTextToFitWidthWithMetadata(text, availableWidth, fontFamily)
  }, [availableWidth, fontFamily, text])

  useEffect(() => {
    onTotalChunksCalculated?.(chunks.length)
    if (chunks.length > 0) {
      onChunkWordCounts?.(chunks.map((chunk) => chunk.wordCount))
    }
  }, [chunks, onChunkWordCounts, onTotalChunksCalculated])

  return { chunks, availableWidth, fontFamily }
}

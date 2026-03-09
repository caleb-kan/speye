import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from 'react'

type UseStaticPaginationOptions = {
  /** Current word index being highlighted */
  currentWordIndex: number
  /** Total number of words in the text */
  totalWords: number
  /** Whether pagination is enabled (false for dynamic scrolling mode) */
  enabled?: boolean
  /** Extra pixels from bottom edge to trigger page flip early */
  nearBottomThreshold?: number
  /** Callback when page changes */
  onPageChange?: (pageStartIndex: number) => void
}

type UseStaticPaginationReturn = {
  /** Index of first word on current page */
  pageStartIndex: number
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Map of word indices to their DOM elements */
  wordRefs: React.MutableRefObject<Map<number, HTMLSpanElement>>
  /** Function to create a ref callback for a word span */
  setWordRef: (globalIndex: number) => (el: HTMLSpanElement | null) => void
  /** Whether we're in the process of flipping backwards */
  needsBackwardsFlip: boolean
}

/**
 * Hook to manage static pagination for text display
 *
 * Handles:
 * - Page state (pageStartIndex)
 * - Word ref management
 * - Backwards navigation (when currentWordIndex < pageStartIndex)
 * - Forward overflow detection (when current word exits container)
 *
 * Used by both TextDisplay (static mode) and AdaptiveTextDisplay
 */
export function useStaticPagination({
  currentWordIndex,
  totalWords,
  enabled = true,
  nearBottomThreshold = 0,
  onPageChange,
}: UseStaticPaginationOptions): UseStaticPaginationReturn {
  const [pageStartIndex, setPageStartIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map())

  // Handle backwards navigation using React's "derived state during render" pattern
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const needsBackwardsFlip = enabled && currentWordIndex < pageStartIndex
  if (needsBackwardsFlip) {
    setPageStartIndex(currentWordIndex)
  }

  // Clear word refs when page changes to prevent memory accumulation
  useEffect(() => {
    wordRefs.current.clear()
  }, [pageStartIndex])

  // Handle forward navigation - detect when current word overflows container
  useLayoutEffect(() => {
    if (!enabled || needsBackwardsFlip) return

    const container = containerRef.current
    const currentWordEl = wordRefs.current.get(currentWordIndex)

    if (!container || !currentWordEl) return

    const containerRect = container.getBoundingClientRect()
    const wordRect = currentWordEl.getBoundingClientRect()

    const isOutside =
      wordRect.bottom > containerRect.bottom || wordRect.top < containerRect.top

    const isNearBottom =
      nearBottomThreshold > 0 &&
      wordRect.bottom > containerRect.bottom - nearBottomThreshold

    if (isOutside || isNearBottom) {
      const nextStartIndex =
        isNearBottom && currentWordIndex + 1 < totalWords
          ? currentWordIndex + 1
          : currentWordIndex

      queueMicrotask(() => {
        setPageStartIndex(nextStartIndex)
        onPageChange?.(nextStartIndex)
      })
    }
  }, [
    currentWordIndex,
    pageStartIndex,
    needsBackwardsFlip,
    enabled,
    nearBottomThreshold,
    onPageChange,
    totalWords,
  ])

  const setWordRef = useCallback(
    (globalIndex: number) => (el: HTMLSpanElement | null) => {
      if (el) {
        wordRefs.current.set(globalIndex, el)
      } else {
        wordRefs.current.delete(globalIndex)
      }
    },
    []
  )

  return {
    pageStartIndex,
    containerRef,
    wordRefs,
    setWordRef,
    needsBackwardsFlip,
  }
}

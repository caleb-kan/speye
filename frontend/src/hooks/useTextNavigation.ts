import { useCallback, useEffect, useRef, useState } from 'react'
import type { Text } from '../types/database'
import { useTexts } from './useTexts'
import { useRecentlyQuizzedTextIds } from './useRecentlyQuizzedTextIds'

type UseTextNavigationOptions = {
  /** Text filters for fetching */
  filters: {
    fiction: boolean
    complexityMin: number
    complexityMax: number
  }
  /** Library text passed via navigation state */
  libraryText?: Text | null
  /** Preserved text from mode switch */
  preservedText?: Text | null
  /** Callback to clear library text (navigate to clear state) */
  onClearLibraryText: () => void
  /** Current text complexity (to avoid refetch when still in range) */
  currentTextComplexity: number | null
  /** Callback when filters change and fetch a new text */
  onFiltersChanged?: () => void
  /** User ID for excluding recently-quizzed texts */
  userId?: string | null
}

type UseTextNavigationReturn = {
  /** Current text to display (library text takes priority over fetched) */
  currentText: Text | null
  /** Whether texts are loading (false if library text is available) */
  loading: boolean
  /** Error message if fetch failed (null if library text is available) */
  error: string | null
  /** Navigate to next text */
  handleNewText: () => void
  /** Refetch texts from server */
  refetch: () => void
}

/**
 * Hook for text navigation with library text support
 *
 * Features:
 * - Library text override (from navigation state) - locks filters
 * - Preserved text (from mode switch) - does NOT lock filters
 * - Random text fetching via master's optimized RPC
 * - Consistent handleNewText behavior
 *
 * Used by both Home and Adaptive pages
 */
export function useTextNavigation({
  filters,
  libraryText,
  preservedText,
  onClearLibraryText,
  currentTextComplexity,
  onFiltersChanged,
  userId,
}: UseTextNavigationOptions): UseTextNavigationReturn {
  const recentlyQuizzedTextIds = useRecentlyQuizzedTextIds(userId ?? null)
  const [filtersChanged, setFiltersChanged] = useState(false)
  const initialFiltersRef = useRef<typeof filters | null>(null)
  const preservedTextIdRef = useRef<string | null>(null)

  // Capture the filters at the moment preservedText is set.
  // INTENTIONALLY excludes `filters` from deps: we want to snapshot the filters
  // when the preservedText arrives, not re-run when filters change later.
  // This allows us to detect when the user changes filters AFTER switching modes.
  useEffect(() => {
    const newPreservedTextId = preservedText?.id ?? null
    if (newPreservedTextId !== preservedTextIdRef.current) {
      preservedTextIdRef.current = newPreservedTextId
      if (preservedText) {
        // Snapshot current filters when preservedText is set
        initialFiltersRef.current = { ...filters }
        setFiltersChanged(false)
      } else {
        initialFiltersRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: snapshot filters when preservedText changes, not when filters change
  }, [preservedText])

  useEffect(() => {
    if (preservedText && !filtersChanged && initialFiltersRef.current) {
      const fictionChanged =
        filters.fiction !== initialFiltersRef.current.fiction

      const preservedComplexity = preservedText.complexity
      const isOutOfComplexityRange =
        preservedComplexity !== null &&
        (preservedComplexity < filters.complexityMin ||
          preservedComplexity > filters.complexityMax)

      if (fictionChanged || isOutOfComplexityRange) {
        setFiltersChanged(true)
        onFiltersChanged?.()
      }
    }
  }, [filters, preservedText, filtersChanged, onFiltersChanged])

  const { randomText, loading, error, refetch } = useTexts({
    ...filters,
    currentTextComplexity: filtersChanged ? null : currentTextComplexity,
    excludeTextIds: recentlyQuizzedTextIds,
  })

  const currentText =
    libraryText ||
    (preservedText && !filtersChanged ? preservedText : randomText)

  const handleNewText = useCallback(() => {
    if (libraryText || preservedText) {
      onClearLibraryText()
    } else {
      refetch()
    }
  }, [libraryText, preservedText, onClearLibraryText, refetch])

  return {
    currentText,
    loading: loading && !libraryText && !(preservedText && !filtersChanged),
    error: libraryText || (preservedText && !filtersChanged) ? null : error,
    handleNewText,
    refetch,
  }
}

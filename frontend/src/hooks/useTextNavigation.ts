import { useCallback } from 'react'
import type { Text } from '../types/database'
import { useTexts } from './useTexts'

type UseTextNavigationOptions = {
  /** Text filters for fetching */
  filters: {
    fiction: boolean
    complexityMin: number
    complexityMax: number
  }
  /** Library text passed via navigation state */
  libraryText?: Text | null
  /** Callback to clear library text (navigate to clear state) */
  onClearLibraryText: () => void
  /** Current text complexity (to avoid refetch when still in range) */
  currentTextComplexity: number | null
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
 * - Library text override (from navigation state)
 * - Random text fetching via master's optimized RPC
 * - Consistent handleNewText behavior
 *
 * Used by both Home and Adaptive pages
 */
export function useTextNavigation({
  filters,
  libraryText,
  onClearLibraryText,
  currentTextComplexity,
}: UseTextNavigationOptions): UseTextNavigationReturn {
  const { randomText, loading, error, refetch } = useTexts({
    ...filters,
    currentTextComplexity,
  })

  // Current text: library text takes priority, then fetched random text
  const currentText = libraryText || randomText

  const handleNewText = useCallback(() => {
    if (libraryText) {
      // Clear library text and switch to fetched texts
      onClearLibraryText()
    } else {
      // Fetch a new random text
      refetch()
    }
  }, [libraryText, onClearLibraryText, refetch])

  return {
    currentText,
    // Don't show loading if we have library text
    loading: loading && !libraryText,
    // Don't show error if we have library text
    error: libraryText ? null : error,
    handleNewText,
    refetch,
  }
}

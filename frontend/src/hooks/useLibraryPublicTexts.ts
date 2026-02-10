import { useCallback, useEffect, useRef } from 'react'
import type { LibraryTab } from '../components/library/LibraryTabs'
import type { TextPreview } from '../types/database'
import { fetchPublicLibraryTexts } from '../services/libraryService'
import { useAsyncOperation } from './useAsyncOperation'

export type UseLibraryPublicTextsResult = {
  publicTexts: TextPreview[] | null
  publicLoading: boolean
  publicError: string | null
  refetchPublicTexts: () => void
}

export const useLibraryPublicTexts = (
  activeTab: LibraryTab
): UseLibraryPublicTextsResult => {
  const {
    data: publicTexts,
    loading: publicLoading,
    error: publicError,
    execute: executePublic,
  } = useAsyncOperation<TextPreview[]>()

  const hasFetchedRef = useRef(false)

  const fetchPublicTexts = useCallback(
    async (force = false) => {
      if (hasFetchedRef.current && !force) return

      await executePublic(async () => {
        const result = await fetchPublicLibraryTexts()
        return result || []
      })
      hasFetchedRef.current = true
    },
    [executePublic]
  )

  useEffect(() => {
    if (activeTab === 'public') {
      fetchPublicTexts()
    }
  }, [activeTab, fetchPublicTexts])

  return {
    publicTexts,
    publicLoading,
    publicError,
    refetchPublicTexts: useCallback(
      () => fetchPublicTexts(true),
      [fetchPublicTexts]
    ),
  }
}

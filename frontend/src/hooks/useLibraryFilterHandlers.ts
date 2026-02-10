import type { ChangeEvent } from 'react'
import { useCallback } from 'react'

export type UseLibraryFilterHandlersParams = {
  handleFilterSearchChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleFilterResetSearch: () => void
  setGenreFilter: (genre: 'all' | 'fiction' | 'non-fiction') => void
  setSortBy: (sortBy: 'complexity' | 'date') => void
  clearFilters: () => void
  resetSlider: () => void
  onPageReset: () => void
}

export type UseLibraryFilterHandlersResult = {
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleResetSearch: () => void
  handleGenreChange: (genre: 'all' | 'fiction' | 'non-fiction') => void
  handleSortChange: (nextSortBy: 'complexity' | 'date') => void
  handleClearFilters: () => void
}

export const useLibraryFilterHandlers = (
  params: UseLibraryFilterHandlersParams
): UseLibraryFilterHandlersResult => {
  const {
    handleFilterSearchChange,
    handleFilterResetSearch,
    setGenreFilter,
    setSortBy,
    clearFilters,
    resetSlider,
    onPageReset,
  } = params

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFilterSearchChange(event)
      onPageReset()
    },
    [handleFilterSearchChange, onPageReset]
  )

  const handleResetSearch = useCallback(() => {
    handleFilterResetSearch()
    onPageReset()
  }, [handleFilterResetSearch, onPageReset])

  const handleGenreChange = useCallback(
    (genre: 'all' | 'fiction' | 'non-fiction') => {
      setGenreFilter(genre)
      onPageReset()
    },
    [setGenreFilter, onPageReset]
  )

  const handleSortChange = useCallback(
    (nextSortBy: 'complexity' | 'date') => {
      setSortBy(nextSortBy)
      onPageReset()
    },
    [setSortBy, onPageReset]
  )

  const handleClearFilters = useCallback(() => {
    clearFilters()
    resetSlider()
    onPageReset()
  }, [clearFilters, resetSlider, onPageReset])

  return {
    handleSearchChange,
    handleResetSearch,
    handleGenreChange,
    handleSortChange,
    handleClearFilters,
  }
}

import type { ChangeEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { MAX_COMPLEXITY, MIN_COMPLEXITY } from '../constants/complexity'
import type { TextPreview } from '../types/database'

export type GenreFilter = 'all' | 'fiction' | 'non-fiction'
export type SortBy = 'complexity' | 'date'
export type SortDirection = 'asc' | 'desc'

export type FilterOptions = {
  genre: GenreFilter
  minComplexity: number | null
  maxComplexity: number | null
}

export type UseLibraryFiltersResult = {
  searchQuery: string
  filters: FilterOptions
  sortBy: SortBy
  sortDirection: SortDirection
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleResetSearch: () => void
  setGenreFilter: (genre: GenreFilter) => void
  setSortBy: (sortBy: SortBy) => void
  toggleSortDirection: () => void
  clearFilters: () => void
  setFilters: (updater: (prev: FilterOptions) => FilterOptions) => void
  filteredTexts: TextPreview[]
  sortedAndFilteredTexts: TextPreview[]
  hasActiveFilters: boolean
}

const defaultFilters: FilterOptions = {
  genre: 'all',
  minComplexity: null,
  maxComplexity: null,
}

export const useLibraryFilters = (
  texts: TextPreview[] | null
): UseLibraryFiltersResult => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFiltersState] = useState<FilterOptions>(defaultFilters)
  const [sortBy, setSortByState] = useState<SortBy>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(event.target.value)
    },
    []
  )

  const handleResetSearch = useCallback((): void => {
    setSearchQuery('')
  }, [])

  const setGenreFilter = useCallback((genre: GenreFilter): void => {
    setFiltersState((prev) => ({ ...prev, genre }))
  }, [])

  const clearFilters = useCallback((): void => {
    setSearchQuery('')
    setFiltersState(defaultFilters)
  }, [])

  const setFilters = useCallback(
    (updater: (prev: FilterOptions) => FilterOptions): void => {
      setFiltersState(updater)
    },
    []
  )

  const setSortBy = useCallback((nextSortBy: SortBy): void => {
    setSortByState(nextSortBy)
  }, [])

  const toggleSortDirection = useCallback((): void => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  const filteredTexts = useMemo((): TextPreview[] => {
    if (!texts) return []

    return texts.filter((text) => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        (text.title?.toLowerCase().includes(searchLower) ?? false) ||
        text.preview.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false

      if (filters.genre !== 'all') {
        const isFiction = filters.genre === 'fiction'
        if (text.fiction !== isFiction) return false
      }

      if (text.complexity !== null) {
        if (
          filters.minComplexity !== null &&
          text.complexity < filters.minComplexity
        ) {
          return false
        }
        if (
          filters.maxComplexity !== null &&
          text.complexity > filters.maxComplexity
        ) {
          return false
        }
      }

      return true
    })
  }, [filters, searchQuery, texts])

  const sortedAndFilteredTexts = useMemo((): TextPreview[] => {
    const sorted = [...filteredTexts]

    switch (sortBy) {
      case 'complexity':
        sorted.sort((a, b) => {
          const complexityA = a.complexity ?? 0
          const complexityB = b.complexity ?? 0
          return sortDirection === 'asc'
            ? complexityA - complexityB
            : complexityB - complexityA
        })
        break
      case 'date':
        sorted.sort((a, b) => {
          const dateA = new Date(a.uploaded_at).getTime()
          const dateB = new Date(b.uploaded_at).getTime()
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
        })
        break
    }

    return sorted
  }, [filteredTexts, sortBy, sortDirection])

  const hasActiveFilters = useMemo((): boolean => {
    return (
      Boolean(searchQuery) ||
      filters.genre !== 'all' ||
      (filters.minComplexity !== null &&
        filters.minComplexity > MIN_COMPLEXITY) ||
      (filters.maxComplexity !== null && filters.maxComplexity < MAX_COMPLEXITY)
    )
  }, [filters, searchQuery])

  return {
    searchQuery,
    filters,
    sortBy,
    sortDirection,
    handleSearchChange,
    handleResetSearch,
    setGenreFilter,
    setSortBy,
    toggleSortDirection,
    clearFilters,
    setFilters,
    filteredTexts,
    sortedAndFilteredTexts,
    hasActiveFilters,
  }
}

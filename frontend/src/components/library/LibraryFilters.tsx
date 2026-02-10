import type { ChangeEvent, RefObject } from 'react'
import { Search, X } from 'lucide-react'
import type {
  FilterOptions,
  GenreFilter,
  SortBy,
  SortDirection,
} from '../../hooks/useLibraryFilters'
import type { SliderElement } from '../../hooks/useComplexitySlider'

export type LibraryFiltersProps = {
  searchQuery: string
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void
  onResetSearch: () => void
  showFilters: boolean
  onToggleFilters: () => void
  sortBy: SortBy
  sortDirection: SortDirection
  onSortChange: (value: SortBy) => void
  onToggleSortDirection: () => void
  filters: FilterOptions
  onGenreChange: (genre: GenreFilter) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  resultsCount: number
  sliderRef: RefObject<SliderElement | null>
}

export function LibraryFilters({
  searchQuery,
  onSearchChange,
  onResetSearch,
  showFilters,
  onToggleFilters,
  sortBy,
  sortDirection,
  onSortChange,
  onToggleSortDirection,
  filters,
  onGenreChange,
  onClearFilters,
  hasActiveFilters,
  resultsCount,
  sliderRef,
}: LibraryFiltersProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="text"
          placeholder="Search texts by title or content..."
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full pl-10 pr-10 py-2.5 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onResetSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onToggleFilters}
          className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label
              htmlFor="sort-select"
              className="text-sm font-medium text-primary"
            >
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortBy)}
              className="px-3 py-2 bg-bg border border-primary/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="date">Date Created</option>
              <option value="complexity">Complexity</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleSortDirection}
            className="px-3 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-2xl leading-none flex items-center justify-center"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-bg-secondary rounded-lg border border-text-secondary/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Genre
              </label>
              <div className="flex flex-col gap-2">
                {(['all', 'fiction', 'non-fiction'] as const).map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => onGenreChange(genre)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.genre === genre
                        ? 'bg-primary text-bg'
                        : 'bg-bg border border-text-secondary/20 text-text-secondary hover:text-text'
                    }`}
                  >
                    {genre === 'all'
                      ? 'All'
                      : genre === 'fiction'
                        ? 'Fiction'
                        : 'Non-Fiction'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Complexity Range
              </label>
              <div className="flex items-center pt-6">
                <div ref={sliderRef} style={{ width: '100%' }} />
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="px-3 py-2 text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <p className="text-sm text-text-secondary">
          Found {resultsCount} text{resultsCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

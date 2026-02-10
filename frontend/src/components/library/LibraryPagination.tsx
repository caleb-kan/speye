import type { KeyboardEvent, RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type JumpToPageState = {
  value: string
  isFocused: boolean
}

export type LibraryPaginationProps = {
  currentPage: number
  totalPages: number
  jumpToPage: JumpToPageState
  jumpToPageInputRef: RefObject<HTMLInputElement | null>
  onPrevPage: () => void
  onNextPage: () => void
  onJumpInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onJumpInputChange: (value: string) => void
  onJumpInputFocus: () => void
  onJumpInputBlur: () => void
}

export function LibraryPagination({
  currentPage,
  totalPages,
  jumpToPage,
  jumpToPageInputRef,
  onPrevPage,
  onNextPage,
  onJumpInputKeyDown,
  onJumpInputChange,
  onJumpInputFocus,
  onJumpInputBlur,
}: LibraryPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onPrevPage}
        disabled={currentPage === 1}
        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary" aria-live="polite">
          Page {currentPage} of {totalPages}
        </span>
        <span className="text-text-secondary/30">|</span>
        <label
          className={`flex items-center px-2 py-1 transition-colors cursor-pointer ${
            jumpToPage.isFocused || jumpToPage.value
              ? 'text-primary'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          <span>custom:&nbsp;</span>
          <input
            ref={jumpToPageInputRef}
            type="text"
            inputMode="numeric"
            value={jumpToPage.value}
            onChange={(event) => onJumpInputChange(event.target.value)}
            onKeyDown={onJumpInputKeyDown}
            onFocus={onJumpInputFocus}
            onBlur={onJumpInputBlur}
            placeholder=""
            aria-label="Jump to page number"
            className="bg-transparent border-b focus:outline-none text-center border-current"
            style={{ width: `${Math.max(2, jumpToPage.value.length || 1)}ch` }}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

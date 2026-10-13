import { useEffect, useState, type KeyboardEvent, type RefObject } from 'react'
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'

export type JumpToPageState = {
  value: string
  isFocused: boolean
}

export type LibraryPaginationProps = {
  currentPage: number
  totalPages: number
  jumpToPage: JumpToPageState
  jumpToPageInputRef: RefObject<HTMLInputElement | null>
  onFirstPage: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onLastPage: () => void
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
  onFirstPage,
  onPrevPage,
  onNextPage,
  onLastPage,
  onJumpInputKeyDown,
  onJumpInputChange,
  onJumpInputFocus,
  onJumpInputBlur,
}: LibraryPaginationProps) {
  const isMobile = useIsMobile()
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    const container = document.querySelector('main')
    if (!container) return

    const SCROLL_BOTTOM_THRESHOLD_PX = 20

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isScrollable = scrollHeight > clientHeight + 1
      setIsAtBottom(
        isScrollable &&
          scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD_PX
      )
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const navigateAndScroll = (navigate: () => void) => {
    navigate()
    requestAnimationFrame(() => {
      document.querySelector('main')?.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    })
  }

  if (totalPages <= 1) return null

  const mobileControlClass = isMobile
    ? 'min-w-11 min-h-11 scroll-mt-16 scroll-mb-(--mobile-navigation-height)'
    : ''
  const buttonClass = `p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${mobileControlClass} ${isMobile ? 'grid place-items-center shrink-0' : ''}`

  return (
    <nav
      className={`flex items-center py-1.5 rounded-full whitespace-nowrap transition-all duration-500 ease-in-out motion-reduce:transition-none ${
        isMobile
          ? 'relative z-0 mt-4 max-w-full flex-wrap justify-center px-1 gap-1 bg-bg backdrop-blur-md shadow-md scroll-mt-16 scroll-mb-(--mobile-navigation-height)'
          : isAtBottom
            ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 bg-transparent shadow-none backdrop-blur-none gap-6'
            : 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 bg-bg backdrop-blur-md shadow-md gap-3'
      }`}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => navigateAndScroll(onFirstPage)}
        disabled={currentPage === 1}
        className={buttonClass}
        aria-label="First page"
      >
        <ChevronFirst className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => navigateAndScroll(onPrevPage)}
        disabled={currentPage === 1}
        className={buttonClass}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span
        className={`text-sm text-text-secondary ${isMobile ? 'px-1' : 'px-2'}`}
        aria-live="polite"
      >
        {jumpToPage.isFocused ? (
          <input
            ref={jumpToPageInputRef}
            type="text"
            inputMode="numeric"
            value={jumpToPage.value}
            onChange={(event) => onJumpInputChange(event.target.value)}
            onKeyDown={onJumpInputKeyDown}
            onBlur={onJumpInputBlur}
            autoFocus
            aria-label="Jump to page number"
            className={`bg-transparent border-b border-primary text-primary focus:outline-none text-center text-sm ${mobileControlClass}`}
            style={{
              width: isMobile
                ? '3ch'
                : `${Math.max(String(currentPage).length, jumpToPage.value.length || 1)}ch`,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={onJumpInputFocus}
            className={`border-b border-current hover:text-primary hover:border-primary transition-colors cursor-text ${mobileControlClass}`}
          >
            {currentPage}
          </button>
        )}
        {' / '}
        {totalPages}
      </span>

      <button
        type="button"
        onClick={() => navigateAndScroll(onNextPage)}
        disabled={currentPage >= totalPages}
        className={buttonClass}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => navigateAndScroll(onLastPage)}
        disabled={currentPage >= totalPages}
        className={buttonClass}
        aria-label="Last page"
      >
        <ChevronLast className="w-4 h-4" />
      </button>
    </nav>
  )
}

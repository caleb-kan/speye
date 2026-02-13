import type { KeyboardEvent, RefObject } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { JumpToPageState } from '../components/library/LibraryPagination'
import { useEscapeKey } from './useEscapeKey'

export type UseLibraryPaginationResult<T> = {
  currentPage: number
  setCurrentPage: (value: number) => void
  resetPage: () => void
  totalPages: number
  validatedCurrentPage: number
  paginatedItems: T[]
  jumpToPage: JumpToPageState
  jumpToPageInputRef: RefObject<HTMLInputElement | null>
  handlePreviousPage: () => void
  handleNextPage: () => void
  handleJumpInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  handleJumpInputChange: (value: string) => void
  handleJumpInputFocus: () => void
  handleJumpInputBlur: () => void
}

export const useLibraryPagination = <T>(
  items: T[],
  pageSize: number
): UseLibraryPaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpToPage, setJumpToPage] = useState<JumpToPageState>({
    value: '',
    isFocused: false,
  })
  const jumpToPageInputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const validatedCurrentPage = Math.min(currentPage, totalPages)

  const paginatedItems = useMemo(() => {
    const startIndex = (validatedCurrentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return items.slice(startIndex, endIndex)
  }, [items, pageSize, validatedCurrentPage])

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }, [totalPages])

  const handleJumpToPage = useCallback(() => {
    const pageNum = parseInt(jumpToPage.value, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
      setJumpToPage({ value: '', isFocused: false })
      jumpToPageInputRef.current?.blur()
    }
  }, [jumpToPage.value, totalPages])

  const handleJumpInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleJumpToPage()
      }
    },
    [handleJumpToPage]
  )

  const handleEscapeClearInput = useCallback(() => {
    setJumpToPage({ value: '', isFocused: false })
    jumpToPageInputRef.current?.blur()
  }, [])

  useEscapeKey(handleEscapeClearInput, jumpToPage.isFocused)

  const handleJumpInputChange = useCallback((value: string) => {
    setJumpToPage((prev) => ({
      ...prev,
      value: value.replace(/[^0-9]/g, ''),
    }))
  }, [])

  const handleJumpInputFocus = useCallback(() => {
    setJumpToPage((prev) => ({ ...prev, isFocused: true }))
    jumpToPageInputRef.current?.focus()
  }, [])

  const handleJumpInputBlur = useCallback(() => {
    if (!jumpToPage.value) {
      setJumpToPage((prev) => ({ ...prev, isFocused: false }))
    }
  }, [jumpToPage.value])

  return {
    currentPage,
    setCurrentPage,
    resetPage,
    totalPages,
    validatedCurrentPage,
    paginatedItems,
    jumpToPage,
    jumpToPageInputRef,
    handlePreviousPage,
    handleNextPage,
    handleJumpInputKeyDown,
    handleJumpInputChange,
    handleJumpInputFocus,
    handleJumpInputBlur,
  }
}

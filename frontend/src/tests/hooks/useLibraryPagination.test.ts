import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useLibraryPagination } from '../../hooks/useLibraryPagination'

it('goes back from the visible page after deleting the final page item', () => {
  const items = Array.from({ length: 21 }, (_, index) => index)
  const { result, rerender } = renderHook(
    ({ texts }) => useLibraryPagination(texts, 10),
    { initialProps: { texts: items } }
  )
  act(() => result.current.handleLastPage())
  expect(result.current.paginatedItems).toEqual([20])

  rerender({ texts: items.slice(0, 20) })
  expect(result.current.validatedCurrentPage).toBe(2)
  act(() => result.current.handlePreviousPage())
  expect(result.current.validatedCurrentPage).toBe(1)
  expect(result.current.paginatedItems).toEqual(items.slice(0, 10))
})

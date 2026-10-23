import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useTexts } from '../../hooks/useTexts'
import { getRandomText } from '../../services/textService'
import type { Text } from '../../types/database'
import { libraryTexts } from '../e2e/utils/mocks'

vi.mock('../../services/textService', () => ({
  getRandomText: vi.fn(),
}))

const initialFilters = {
  fiction: true,
  complexityMin: 14,
  complexityMax: 15,
  currentTextComplexity: null as number | null,
}

const mockGetRandomText = vi.mocked(getRandomText)

describe('useTexts complexity changes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRandomText.mockResolvedValue(null)
  })

  it('fetches the new range after the previous range has no texts', async () => {
    const { result, rerender } = renderHook(useTexts, {
      initialProps: initialFilters,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ ...initialFilters, complexityMin: 1, complexityMax: 10 })

    await waitFor(() => expect(mockGetRandomText).toHaveBeenCalledTimes(2))
    expect(mockGetRandomText).toHaveBeenLastCalledWith({
      fiction: true,
      complexityMin: 1,
      complexityMax: 10,
      excludeTextIds: undefined,
    })
  })

  it('allows a changed range to retry a failed initial request', async () => {
    mockGetRandomText.mockRejectedValueOnce(new Error('Connection failed'))
    const { result, rerender } = renderHook(useTexts, {
      initialProps: initialFilters,
    })
    await waitFor(() => expect(result.current.error).toBe('Connection failed'))

    rerender({ ...initialFilters, complexityMin: 1, complexityMax: 10 })

    await waitFor(() => expect(mockGetRandomText).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  it('keeps the selected text when it is inside the new range', async () => {
    const { result, rerender } = renderHook(useTexts, {
      initialProps: { ...initialFilters, currentTextComplexity: 14 },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({
      ...initialFilters,
      complexityMin: 12,
      currentTextComplexity: 14,
    })

    expect(mockGetRandomText).toHaveBeenCalledTimes(1)
  })

  it.each(['success', 'failure'] as const)(
    'ignores an abandoned range request after returning to the selected text on %s',
    async (outcome) => {
      const selected: Text = {
        ...libraryTexts[0],
        content: 'Synthetic selected text.',
        summary: null,
        complexity: 5,
        sectional: false,
        section_content: null,
      }
      let resolve!: (text: Text | null) => void
      let reject!: (error: Error) => void
      const pending = new Promise<Text | null>((res, rej) => {
        resolve = res
        reject = rej
      })
      mockGetRandomText
        .mockResolvedValueOnce(selected)
        .mockReturnValueOnce(pending)
      const filters = {
        ...initialFilters,
        complexityMin: 1,
        complexityMax: 10,
        currentTextComplexity: 5,
      }
      const { result, rerender } = renderHook(useTexts, {
        initialProps: filters,
      })
      await waitFor(() => expect(result.current.randomText).toEqual(selected))
      rerender({ ...filters, complexityMin: 11, complexityMax: 20 })
      expect(result.current.loading).toBe(true)
      rerender(filters)
      await act(async () => {
        if (outcome === 'success') {
          resolve({ ...selected, id: 'abandoned-text', complexity: 15 })
        } else {
          reject(new Error('Superseded range failed'))
        }
      })

      expect(result.current.randomText).toEqual(selected)
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(mockGetRandomText).toHaveBeenCalledTimes(2)
    }
  )

  it('finishes a genre change when the difficulty range changes during its request', async () => {
    const fiction: Text = {
      ...libraryTexts[0],
      content: 'Synthetic fiction passage.',
      summary: null,
      complexity: 5,
      sectional: false,
      section_content: null,
    }
    const nonfiction = { ...fiction, id: 'nonfiction-text', fiction: false }
    let resolve!: (text: Text | null) => void
    const pending = new Promise<Text | null>((res) => {
      resolve = res
    })
    mockGetRandomText
      .mockResolvedValueOnce(fiction)
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(nonfiction)
    const filters = {
      ...initialFilters,
      complexityMin: 1,
      complexityMax: 10,
      currentTextComplexity: 5,
    }
    const { result, rerender } = renderHook(useTexts, {
      initialProps: filters,
    })
    await waitFor(() => expect(result.current.randomText).toEqual(fiction))
    rerender({ ...filters, fiction: false })
    rerender({ ...filters, fiction: false, complexityMax: 12 })
    await act(async () => resolve({ ...nonfiction, id: 'abandoned-text' }))

    await waitFor(() => expect(result.current.randomText).toEqual(nonfiction))
    expect(mockGetRandomText).toHaveBeenLastCalledWith({
      fiction: false,
      complexityMin: 1,
      complexityMax: 12,
      excludeTextIds: undefined,
    })
    expect(result.current.loading).toBe(false)
  })
})

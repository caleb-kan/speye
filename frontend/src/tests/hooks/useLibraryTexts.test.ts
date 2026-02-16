import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { TextPreview } from '../../types/database'

let capturedCallbacks: {
  onInsert?: (text: TextPreview) => void
  onUpdate?: (text: TextPreview) => void
  onDelete?: (textId: string) => void
}

vi.mock('../../hooks/useTextSubscription', () => ({
  useTextSubscription: (
    _userId: string | null,
    callbacks: typeof capturedCallbacks
  ) => {
    capturedCallbacks = callbacks
  },
}))

vi.mock('../../services/libraryService', () => ({
  fetchUserLibraryTexts: vi.fn(),
}))

import { useLibraryTexts } from '../../hooks/useLibraryTexts'
import { fetchUserLibraryTexts } from '../../services/libraryService'

const mockFetch = vi.mocked(fetchUserLibraryTexts)

const makeTextPreview = (
  overrides: Partial<TextPreview> = {}
): TextPreview => ({
  id: 'text-1',
  title: 'Test Title',
  preview: 'Test preview...',
  uploaded_at: '2026-01-01',
  owner_id: 'user-1',
  fiction: true,
  complexity: 5,
  source: null,
  processing_status: 'completed',
  quiz_valid: true,
  quiz: { questionSets: [{ questions: [] }] },
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  rejection_reason: null,
  rejection_stage: null,
  has_summary: false,
  ...overrides,
})

describe('useLibraryTexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue([])
  })

  it('fetches texts on mount when userId is provided', async () => {
    const texts = [makeTextPreview()]
    mockFetch.mockResolvedValue(texts)

    const { result } = renderHook(() => useLibraryTexts('user-1'))

    await waitFor(() => {
      expect(result.current.texts).toEqual(texts)
    })
    expect(mockFetch).toHaveBeenCalledWith('user-1')
  })

  it('sets texts to null when userId is null', () => {
    const { result } = renderHook(() => useLibraryTexts(null))
    expect(result.current.texts).toBeNull()
  })

  describe('real-time subscription callbacks', () => {
    it('inserts new text via onInsert', async () => {
      const existing = makeTextPreview({ id: 'text-1' })
      mockFetch.mockResolvedValue([existing])

      const { result } = renderHook(() => useLibraryTexts('user-1'))
      await waitFor(() => {
        expect(result.current.texts).toHaveLength(1)
      })

      const newText = makeTextPreview({ id: 'text-2', title: 'New' })
      act(() => {
        capturedCallbacks.onInsert?.(newText)
      })

      expect(result.current.texts).toHaveLength(2)
      expect(result.current.texts![0].id).toBe('text-2')
    })

    it('prevents duplicate inserts', async () => {
      const existing = makeTextPreview({ id: 'text-1' })
      mockFetch.mockResolvedValue([existing])

      const { result } = renderHook(() => useLibraryTexts('user-1'))
      await waitFor(() => {
        expect(result.current.texts).toHaveLength(1)
      })

      act(() => {
        capturedCallbacks.onInsert?.(existing)
      })

      expect(result.current.texts).toHaveLength(1)
    })

    it('preserves quiz when real-time update arrives with quiz: null (TOAST omission)', async () => {
      const originalQuiz = {
        questionSets: [
          {
            questions: [
              { question: 'Q1', options: ['A', 'B'], correctAnswer: 0 },
            ],
          },
        ],
      }
      const existing = makeTextPreview({ id: 'text-1', quiz: originalQuiz })
      mockFetch.mockResolvedValue([existing])

      const { result } = renderHook(() => useLibraryTexts('user-1'))
      await waitFor(() => {
        expect(result.current.texts).toHaveLength(1)
      })

      // Simulate a real-time UPDATE where quiz is null (TOAST column omitted)
      const updateWithNullQuiz = makeTextPreview({
        id: 'text-1',
        quiz: null,
        quiz_valid: true,
      })
      act(() => {
        capturedCallbacks.onUpdate?.(updateWithNullQuiz)
      })

      // Quiz should be preserved from the previous state
      expect(result.current.texts![0].quiz).toEqual(originalQuiz)
      // Other fields should still be updated
      expect(result.current.texts![0].quiz_valid).toBe(true)
    })

    it('replaces quiz when real-time update provides a new quiz', async () => {
      const originalQuiz = {
        questionSets: [
          {
            questions: [
              { question: 'Q1', options: ['A', 'B'], correctAnswer: 0 },
            ],
          },
        ],
      }
      const newQuiz = {
        questionSets: [
          {
            questions: [
              { question: 'Q2', options: ['C', 'D'], correctAnswer: 1 },
            ],
          },
        ],
      }
      const existing = makeTextPreview({ id: 'text-1', quiz: originalQuiz })
      mockFetch.mockResolvedValue([existing])

      const { result } = renderHook(() => useLibraryTexts('user-1'))
      await waitFor(() => {
        expect(result.current.texts).toHaveLength(1)
      })

      const updateWithNewQuiz = makeTextPreview({
        id: 'text-1',
        quiz: newQuiz,
      })
      act(() => {
        capturedCallbacks.onUpdate?.(updateWithNewQuiz)
      })

      expect(result.current.texts![0].quiz).toEqual(newQuiz)
    })

    it('removes text via onDelete', async () => {
      const existing = makeTextPreview({ id: 'text-1' })
      mockFetch.mockResolvedValue([existing])

      const { result } = renderHook(() => useLibraryTexts('user-1'))
      await waitFor(() => {
        expect(result.current.texts).toHaveLength(1)
      })

      act(() => {
        capturedCallbacks.onDelete?.('text-1')
      })

      expect(result.current.texts).toHaveLength(0)
    })
  })
})

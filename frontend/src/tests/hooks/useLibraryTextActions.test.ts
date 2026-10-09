import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLibraryTextActions } from '../../hooks/useLibraryTextActions'
import type { Text, Quiz } from '../../types/database'

vi.mock('../../services/libraryService', () => ({
  updateLibraryTextQuiz: vi.fn(),
  deleteLibraryText: vi.fn(),
  fetchTextContent: vi.fn(),
  retryLibraryTextProcessing: vi.fn(),
  updateLibraryText: vi.fn(),
  uploadLibraryText: vi.fn(),
}))

import {
  updateLibraryTextQuiz,
  updateLibraryText,
  uploadLibraryText,
} from '../../services/libraryService'

const mockUpdatedText: Text = {
  id: 'text-1',
  title: 'Test',
  content: 'Test content',
  summary: null,
  uploaded_at: '2026-01-01',
  owner_id: 'user-1',
  quiz: {
    questionSets: [
      {
        questions: [
          {
            question: 'Q1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
          },
        ],
      },
    ],
  },
  fiction: true,
  complexity: null,
  source: null,
  processing_status: 'completed',
  quiz_valid: true,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
}

const mockQuiz: Quiz = {
  questionSets: [
    {
      questions: [
        {
          question: 'Updated Q1',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 1,
        },
      ],
    },
  ],
}

const createParams = (overrides = {}) => ({
  userId: 'user-1',
  navigate: vi.fn(),
  setPrivateTexts: vi.fn(),
  setSuccessMessage: vi.fn(),
  setDeleteError: vi.fn(),
  activeTab: 'private' as const,
  refetchPublicTexts: vi.fn(),
  ...overrides,
})

describe('useLibraryTextActions - handleQuizSubmit', () => {
  it('propagates edit failures so the form keeps the unsaved text', async () => {
    vi.mocked(updateLibraryText).mockRejectedValue(new Error('Write failed'))
    const params = createParams()
    const { result } = renderHook(() => useLibraryTextActions(params))
    await expect(
      result.current.handleEditSubmit('text-1', {
        content: 'Keep these edits',
        title: 'Edited',
        fiction: true,
      })
    ).rejects.toThrow('Write failed')
    expect(updateLibraryText).toHaveBeenCalledWith('text-1', {
      content: 'Keep these edits',
      title: 'Edited',
      fiction: true,
      quiz: null,
      quiz_valid: false,
      summary: null,
    })
    expect(params.setSuccessMessage).not.toHaveBeenCalled()
  })

  it('propagates public-copy failures so the form stays open', async () => {
    vi.mocked(uploadLibraryText).mockRejectedValue(new Error('Copy failed'))
    const params = createParams()
    const { result } = renderHook(() => useLibraryTextActions(params))
    await expect(
      result.current.handleMakePublicCopy('text-1', {
        content: 'Keep these edits',
        title: 'Edited',
        fiction: true,
      })
    ).rejects.toThrow('Copy failed')
    expect(uploadLibraryText).toHaveBeenCalledWith('user-1', {
      content: 'Keep these edits',
      title: 'Edited',
      fiction: true,
      isPublic: true,
      processing_status: 'pending',
    })
    expect(params.setSuccessMessage).not.toHaveBeenCalled()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateLibraryTextQuiz with correct arguments', async () => {
    vi.mocked(updateLibraryTextQuiz).mockResolvedValue(mockUpdatedText)

    const params = createParams()
    const { result } = renderHook(() => useLibraryTextActions(params))

    await act(async () => {
      await result.current.handleQuizSubmit('text-1', mockQuiz)
    })

    expect(updateLibraryTextQuiz).toHaveBeenCalledWith('text-1', mockQuiz)
  })

  it('updates private texts with preview having quiz_valid: true', async () => {
    vi.mocked(updateLibraryTextQuiz).mockResolvedValue(mockUpdatedText)

    const setPrivateTexts = vi.fn()
    const params = createParams({ setPrivateTexts })
    const { result } = renderHook(() => useLibraryTextActions(params))

    await act(async () => {
      await result.current.handleQuizSubmit('text-1', mockQuiz)
    })

    expect(setPrivateTexts).toHaveBeenCalled()
    // Call the setter function to verify it produces correct output
    const setterFn = setPrivateTexts.mock.calls[0][0]
    const existingTexts = [
      {
        id: 'text-1',
        title: 'Old',
        preview: 'old',
        uploaded_at: '2026-01-01',
        owner_id: 'user-1',
        quiz: null,
        fiction: true,
        complexity: null,
        source: null,
        processing_status: 'completed' as const,
        quiz_valid: false,
        has_summary: false,
        llm_decision: null,
        llm_violation_type: null,
        admin_decision: null,
        rejection_reason: null,
        rejection_stage: null,
        admin_reviewed_by: null,
        admin_reviewed_at: null,
      },
    ]
    const updated = setterFn(existingTexts)
    expect(updated[0].quiz_valid).toBe(true)
  })

  it('sets success message on successful quiz update', async () => {
    vi.mocked(updateLibraryTextQuiz).mockResolvedValue(mockUpdatedText)

    const params = createParams()
    const { result } = renderHook(() => useLibraryTextActions(params))

    await act(async () => {
      await result.current.handleQuizSubmit('text-1', mockQuiz)
    })

    expect(params.setSuccessMessage).toHaveBeenCalledWith(
      'Quiz updated successfully!'
    )
  })

  it('calls refetchPublicTexts when on public tab', async () => {
    vi.mocked(updateLibraryTextQuiz).mockResolvedValue(mockUpdatedText)

    const refetchPublicTexts = vi.fn()
    const params = createParams({
      activeTab: 'public',
      refetchPublicTexts,
    })
    const { result } = renderHook(() => useLibraryTextActions(params))

    await act(async () => {
      await result.current.handleQuizSubmit('text-1', mockQuiz)
    })

    expect(refetchPublicTexts).toHaveBeenCalled()
  })

  it('throws on updateLibraryTextQuiz failure so caller can display error', async () => {
    vi.mocked(updateLibraryTextQuiz).mockRejectedValue(new Error('DB error'))

    const params = createParams()
    const { result } = renderHook(() => useLibraryTextActions(params))

    await expect(
      act(async () => {
        await result.current.handleQuizSubmit('text-1', mockQuiz)
      })
    ).rejects.toThrow('DB error')
  })

  it('does not crash when activeTab is public and refetchPublicTexts is undefined', async () => {
    vi.mocked(updateLibraryTextQuiz).mockResolvedValue(mockUpdatedText)

    const params = createParams({
      activeTab: 'public',
      refetchPublicTexts: undefined,
    })
    const { result } = renderHook(() => useLibraryTextActions(params))

    await act(async () => {
      await result.current.handleQuizSubmit('text-1', mockQuiz)
    })

    expect(params.setSuccessMessage).toHaveBeenCalledWith(
      'Quiz updated successfully!'
    )
  })
})

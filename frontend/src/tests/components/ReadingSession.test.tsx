import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as offlineCacheModule from '../../services/offlineCache'
import * as saveQuizResultModule from '../../services/saveQuizResult'
import { ReadingSession } from '../../components/ReadingSession'
import type { Text, QuestionSet } from '../../types/database'
import type { ReadingContext } from '../../types/reading'

// ── Prop capture (hoisted so they're available inside vi.mock factories) ───────

type CapturedReaderProps = {
  onSectionComplete?: (index: number) => void
  onSectionIndexChange?: (index: number) => void
  showMiniQuiz?: boolean
  quizzedSections?: Set<number>
  totalSectionQuizCount?: number
}

type CapturedQuizButtonProps = {
  readingComplete?: boolean
  onDismiss?: () => void
  onFinish?: (correct: number, total: number) => void
}

const capturedProps = vi.hoisted(() => ({
  reader: {} as CapturedReaderProps,
  quizButton: {} as CapturedQuizButtonProps,
}))

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../components/Reader', () => ({
  Reader: (props: CapturedReaderProps) => {
    capturedProps.reader = props
    return null
  },
}))

vi.mock('../../components/StartQuizButton', () => ({
  StartQuizButton: (props: CapturedQuizButtonProps) => {
    capturedProps.quizButton = props
    return null
  },
}))

vi.mock('../../hooks/useReadingActivitySession', () => ({
  useReadingActivitySession: () => ({ handlePositionChange: vi.fn() }),
}))

vi.mock('../../services/saveQuizResult', () => ({
  saveQuizResult: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/offlineCache', () => ({
  getSectionQuizProgress: vi.fn().mockResolvedValue(null),
  setSectionQuizProgress: vi.fn().mockResolvedValue(undefined),
  clearSectionQuizProgress: vi.fn().mockResolvedValue(undefined),
}))

// ── Test helpers ───────────────────────────────────────────────────────────────

const mockQuestionSet: QuestionSet = {
  questions: [
    { question: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
  ],
}

const createMockText = (overrides: Partial<Text> = {}): Text => ({
  id: 'text-1',
  title: 'Test',
  content: 'alpha beta gamma delta epsilon',
  summary: null,
  uploaded_at: '2024-01-01T00:00:00Z',
  owner_id: 'owner-1',
  // Two section quizzes
  quiz: { questionSets: [mockQuestionSet, mockQuestionSet] },
  fiction: null,
  complexity: null,
  source: null,
  processing_status: 'completed',
  quiz_valid: null,
  llm_decision: null,
  llm_violation_type: null,
  admin_decision: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  rejection_reason: null,
  rejection_stage: null,
  sectional: true,
  section_content: [
    { title: 'Section One', content: 'alpha beta gamma' },
    { title: 'Section Two', content: 'delta epsilon' },
  ],
  ...overrides,
})

const mockContext: ReadingContext = {
  wpm: 200,
  mode: 'standard',
  scrolling: 'static',
  blurEnabled: false,
  fiction: false,
  inputBlocking: false,
  complexityMin: 0,
  complexityMax: 100,
  textWidthPercent: 80,
  visibleLines: 5,
  readingPosition: 0,
  setReadingPosition: vi.fn(),
  onTextWidthChange: vi.fn(),
  quizOpen: false,
  setQuizOpen: vi.fn(),
  currentTextComplexity: null,
  setCurrentTextComplexity: vi.fn(),
  currentText: null,
  setCurrentText: vi.fn(),
}

const renderSession = (
  overrides: Partial<Parameters<typeof ReadingSession>[0]> = {}
) =>
  render(
    <ReadingSession
      currentText={createMockText()}
      context={mockContext}
      onNewText={vi.fn()}
      {...overrides}
    />
  )

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ReadingSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedProps.reader = {}
    capturedProps.quizButton = {}
    vi.mocked(offlineCacheModule.getSectionQuizProgress).mockResolvedValue(null)
    vi.mocked(offlineCacheModule.setSectionQuizProgress).mockResolvedValue(
      undefined
    )
    vi.mocked(offlineCacheModule.clearSectionQuizProgress).mockResolvedValue(
      undefined
    )
    vi.mocked(saveQuizResultModule.saveQuizResult).mockResolvedValue(undefined)
  })

  // ── Initial props passed to Reader ────────────────────────────────────────

  describe('initial Reader props (sectional text)', () => {
    it('passes totalSectionQuizCount equal to the number of question sets', () => {
      renderSession()
      expect(capturedProps.reader.totalSectionQuizCount).toBe(2)
    })

    it('passes an empty quizzedSections set initially', () => {
      renderSession()
      expect(capturedProps.reader.quizzedSections).toBeInstanceOf(Set)
      expect(capturedProps.reader.quizzedSections?.size).toBe(0)
    })

    it('passes showMiniQuiz=false initially', () => {
      renderSession()
      expect(capturedProps.reader.showMiniQuiz).toBe(false)
    })

    it('passes totalSectionQuizCount=undefined for non-sectional texts', () => {
      renderSession({
        currentText: createMockText({
          sectional: false,
          section_content: null,
        }),
      })
      expect(capturedProps.reader.totalSectionQuizCount).toBeUndefined()
    })
  })

  // ── handleSectionComplete ─────────────────────────────────────────────────

  describe('handleSectionComplete — section quiz activation', () => {
    it('activates the quiz overlay (readingComplete=true) when a section with a quiz ends', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      // isSectionQuizActive = true → StartQuizButton receives readingComplete=true
      expect(capturedProps.quizButton.readingComplete).toBe(true)
    })

    it('does not activate for a section index with no quiz', () => {
      // Only 1 quiz set for index 0; section 1 has no quiz
      renderSession({
        currentText: createMockText({
          quiz: { questionSets: [mockQuestionSet] },
        }),
      })
      act(() => {
        capturedProps.reader.onSectionComplete?.(1) // section 1 has no quiz
      })
      expect(capturedProps.quizButton.readingComplete).toBe(false)
    })

    it('does not re-trigger the quiz overlay for the same section after it has been triggered', () => {
      renderSession()
      // Trigger section 0 quiz
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      // Dismiss the overlay
      act(() => {
        capturedProps.quizButton.onDismiss?.()
      })
      // Call onSectionComplete again for the same section (simulates reader looping back)
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      // Overlay must remain dismissed (no re-trigger)
      expect(capturedProps.quizButton.readingComplete).toBe(false)
    })

    it('does not re-trigger if the section quiz has already been completed', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      // Finish the quiz
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      // Simulate reading section 0 again
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      expect(capturedProps.quizButton.readingComplete).toBe(false)
    })
  })

  // ── handleSectionQuizDismiss ──────────────────────────────────────────────

  describe('handleSectionQuizDismiss', () => {
    it('hides the quiz overlay (readingComplete=false) after dismissal', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onDismiss?.()
      })
      expect(capturedProps.quizButton.readingComplete).toBe(false)
    })

    it('does NOT call setSectionQuizProgress on dismissal', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onDismiss?.()
      })
      expect(offlineCacheModule.setSectionQuizProgress).not.toHaveBeenCalled()
    })

    it('does NOT add the section to quizzedSections (dot stays grey)', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onDismiss?.()
      })
      // completedSectionQuizzes controls dot colour — section 0 should NOT be in it
      expect(capturedProps.reader.quizzedSections?.has(0)).toBe(false)
    })

    it('shows the mini quiz button (showMiniQuiz=true) after dismissal', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onDismiss?.()
      })
      expect(capturedProps.reader.showMiniQuiz).toBe(true)
    })
  })

  // ── handleSectionQuizFinish ───────────────────────────────────────────────

  describe('handleSectionQuizFinish', () => {
    it('hides the quiz overlay after finishing', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      expect(capturedProps.quizButton.readingComplete).toBe(false)
    })

    it('adds the section to quizzedSections (dot turns green)', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      expect(capturedProps.reader.quizzedSections?.has(0)).toBe(true)
    })

    it('hides the mini quiz button (showMiniQuiz=false) after finishing', () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      expect(capturedProps.reader.showMiniQuiz).toBe(false)
    })

    it('calls setSectionQuizProgress with the completed section after finishing', async () => {
      renderSession()
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      await waitFor(() => {
        expect(offlineCacheModule.setSectionQuizProgress).toHaveBeenCalledWith(
          'text-1',
          expect.objectContaining({ quizzedSectionIds: [0] })
        )
      })
    })

    it('calls saveQuizResult with an aggregate score once all section quizzes are finished', async () => {
      renderSession()
      // Finish section 0 quiz
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      // Finish section 1 quiz
      act(() => {
        capturedProps.reader.onSectionComplete?.(1)
        capturedProps.reader.onSectionIndexChange?.(1)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(4, 5)
      })
      await waitFor(() => {
        expect(saveQuizResultModule.saveQuizResult).toHaveBeenCalledWith({
          text_id: 'text-1',
          score: expect.any(Number),
        })
      })
    })

    it('calculates the aggregate score as the weighted percentage across sections', async () => {
      renderSession()
      // Section 0: 3/5 correct; Section 1: 4/5 correct → total 7/10 = 70%
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      act(() => {
        capturedProps.reader.onSectionComplete?.(1)
        capturedProps.reader.onSectionIndexChange?.(1)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(4, 5)
      })
      await waitFor(() => {
        expect(saveQuizResultModule.saveQuizResult).toHaveBeenCalledWith({
          text_id: 'text-1',
          score: 70,
        })
      })
    })

    it('does NOT call saveQuizResult until all section quizzes are finished', async () => {
      renderSession()
      // Only finish section 0 (there are 2 quizzes)
      act(() => {
        capturedProps.reader.onSectionComplete?.(0)
      })
      act(() => {
        capturedProps.quizButton.onFinish?.(3, 5)
      })
      await waitFor(() => {
        expect(saveQuizResultModule.saveQuizResult).not.toHaveBeenCalled()
      })
    })
  })

  // ── IndexedDB progress restoration ────────────────────────────────────────

  describe('IndexedDB progress restoration on mount', () => {
    it('restores completedSectionQuizzes from IndexedDB (dots turn green)', async () => {
      vi.mocked(
        offlineCacheModule.getSectionQuizProgress
      ).mockResolvedValueOnce({
        results: [{ correct: 3, total: 5 }, null],
        quizzedSectionIds: [0],
      })
      renderSession()
      await waitFor(() => {
        expect(capturedProps.reader.quizzedSections?.has(0)).toBe(true)
      })
    })

    it('does not update quizzedSections when IndexedDB returns null', async () => {
      vi.mocked(
        offlineCacheModule.getSectionQuizProgress
      ).mockResolvedValueOnce(null)
      renderSession()
      await waitFor(() => {
        expect(capturedProps.reader.quizzedSections?.size).toBe(0)
      })
    })

    it('calls getSectionQuizProgress with the text id on mount', async () => {
      renderSession()
      await waitFor(() => {
        expect(offlineCacheModule.getSectionQuizProgress).toHaveBeenCalledWith(
          'text-1'
        )
      })
    })

    it('does NOT call getSectionQuizProgress for non-sectional texts', async () => {
      renderSession({
        currentText: createMockText({
          sectional: false,
          section_content: null,
        }),
      })
      await waitFor(() => {
        expect(offlineCacheModule.getSectionQuizProgress).not.toHaveBeenCalled()
      })
    })
  })
})

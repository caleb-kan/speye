import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as useTextsModule from '../../hooks/useTexts.ts'
import type { Text } from '../../types/database.ts'
import '@testing-library/jest-dom'
import { renderWithReadingLayout } from '../helpers/renderLayouts.tsx'

vi.mock('../../hooks/useRestoreReadingProgress', () => ({
  // Always return 'false' so the tests skip the "restoring" loading state
  useRestoreReadingProgress: () => false,
}))

vi.mock('../../hooks/useTexts')
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}))
Element.prototype.scrollTo = vi.fn()
window.scrollTo = vi.fn()

const mockUseTexts = vi.mocked(useTextsModule.useTexts)

const createMockText = (content: string): Text => ({
  id: '1',
  title: 'Test Title',
  content,
  summary: null,
  uploaded_at: new Date().toISOString(),
  owner_id: null,
  quiz: null,
  fiction: false,
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
})

describe('Reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('displays loading message when fetching texts', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        randomText: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(screen.getByText('Loading texts...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('displays error message', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        randomText: null,
        loading: false,
        error: 'Network error',
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('displays "Try again" button', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        randomText: null,
        loading: false,
        error: 'Network error',
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument()
    })

    it('clicking "Try again" calls refetch', async () => {
      const mockRefetch = vi.fn()
      mockUseTexts.mockReturnValue({
        texts: [],
        randomText: null,
        loading: false,
        error: 'Network error',
        refetch: mockRefetch,
      })

      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    it('displays "No texts available" message', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        randomText: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(screen.getByText('No texts available')).toBeInTheDocument()
    })
  })

  describe('Text Display', () => {
    it('renders text content when available', () => {
      const mockText = createMockText('Hello world testing')
      mockUseTexts.mockReturnValue({
        randomText: mockText,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('world')).toBeInTheDocument()
      expect(screen.getByText('testing')).toBeInTheDocument()
    })

    it('renders "New text" button when text is available', () => {
      const mockText = createMockText('Test content')
      mockUseTexts.mockReturnValue({
        randomText: mockText,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithReadingLayout()

      expect(
        screen.getByRole('button', { name: 'New text' })
      ).toBeInTheDocument()
    })

    it('clicking "New text" calls selectRandomText', async () => {
      const refetch = vi.fn()
      const mockText = createMockText('Test content')
      mockUseTexts.mockReturnValue({
        randomText: mockText,
        loading: false,
        error: null,
        refetch,
      })

      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: 'New text' }))

      expect(refetch).toHaveBeenCalledTimes(1)
    })
  })
})

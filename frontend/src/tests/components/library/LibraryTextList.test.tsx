import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryTextList } from '../../../components/library/LibraryTextList'
import { TEXT_PREVIEW_LENGTH } from '../../../constants/library'
import { UNTITLED_TEXT_FALLBACK } from '../../../constants/admin'
import type { TextPreview } from '../../../types/database'

vi.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    forceOffline: false,
    setForceOffline: vi.fn(),
    pendingOperations: 0,
    isSyncing: false,
    syncNow: vi.fn(),
  }),
}))

const createMockTextPreview = (
  overrides: Partial<TextPreview> = {}
): TextPreview => ({
  id: 'text-1',
  title: 'Test Title',
  preview: 'Short preview text',
  uploaded_at: '2026-01-15T10:30:00Z',
  owner_id: 'user-1',
  quiz: null,
  fiction: null,
  complexity: null,
  source: null,
  processing_status: 'completed',
  quiz_valid: true,
  has_summary: false,
  llm_decision: 'approved',
  llm_violation_type: null,
  admin_decision: 'approved',
  rejection_reason: null,
  rejection_stage: null,
  admin_reviewed_by: null,
  admin_reviewed_at: null,
  ...overrides,
})

const defaultProps = {
  activeTab: 'public' as const,
  bestScores: {} as Record<string, number>,
  retryingTextIds: new Set<string>(),
  onReadText: vi.fn(),
  onReadSummary: vi.fn(),
  onRetryProcessing: vi.fn(),
  onEditText: vi.fn(),
  onDeleteText: vi.fn(),
}

describe('LibraryTextList', () => {
  describe('preview ellipsis', () => {
    it('should not append ellipsis when preview is shorter than TEXT_PREVIEW_LENGTH', () => {
      const shortPreview = 'A'.repeat(TEXT_PREVIEW_LENGTH - 1)
      const texts = [createMockTextPreview({ preview: shortPreview })]
      render(<LibraryTextList texts={texts} {...defaultProps} />)

      expect(screen.getByText(shortPreview)).toBeInTheDocument()
    })

    it('should append ellipsis when preview length equals TEXT_PREVIEW_LENGTH', () => {
      const exactPreview = 'A'.repeat(TEXT_PREVIEW_LENGTH)
      const texts = [createMockTextPreview({ preview: exactPreview })]
      render(<LibraryTextList texts={texts} {...defaultProps} />)

      expect(screen.getByText(`${exactPreview}...`)).toBeInTheDocument()
    })
  })

  it('should render title', () => {
    const texts = [createMockTextPreview()]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should render fallback title when title is null', () => {
    const texts = [createMockTextPreview({ title: null })]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.getByText(UNTITLED_TEXT_FALLBACK)).toBeInTheDocument()
  })

  it('should show Processing badge when status is pending', () => {
    const texts = [createMockTextPreview({ processing_status: 'pending' })]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('should show Failed badge when status is failed', () => {
    const texts = [createMockTextPreview({ processing_status: 'failed' })]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('should call onReadText when play button is clicked', async () => {
    const user = userEvent.setup()
    const texts = [createMockTextPreview()]
    const onReadText = vi.fn()
    render(
      <LibraryTextList
        {...defaultProps}
        texts={texts}
        onReadText={onReadText}
      />
    )

    await user.click(screen.getByTitle('Start reading'))

    expect(onReadText).toHaveBeenCalledWith(texts[0])
  })

  it('should call onDeleteText when delete button is clicked', async () => {
    const user = userEvent.setup()
    const texts = [createMockTextPreview()]
    const onDeleteText = vi.fn()
    render(
      <LibraryTextList
        {...defaultProps}
        texts={texts}
        activeTab="private"
        onDeleteText={onDeleteText}
      />
    )

    await user.click(screen.getByTitle('Delete text'))

    expect(onDeleteText).toHaveBeenCalledWith('text-1')
  })

  it('should show Read Summary button when text has summary', () => {
    const texts = [createMockTextPreview({ has_summary: true })]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.getByText('Read Summary')).toBeInTheDocument()
  })

  it('should not show Read Summary button when text has no summary', () => {
    const texts = [createMockTextPreview({ has_summary: false })]
    render(<LibraryTextList texts={texts} {...defaultProps} />)

    expect(screen.queryByText('Read Summary')).not.toBeInTheDocument()
  })

  it('should show best score when available', () => {
    const texts = [createMockTextPreview()]
    render(
      <LibraryTextList
        {...defaultProps}
        texts={texts}
        bestScores={{ 'text-1': 85 }}
      />
    )

    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})

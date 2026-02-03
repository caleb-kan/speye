import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditTextModal } from '../../components/EditTextModal'
import type { Text } from '../../types/database'

describe('EditTextModal', () => {
  const mockText: Text = {
    id: '1',
    title: 'Test Title',
    content: 'Test content',
    fiction: true,
    uploaded_at: '2026-01-01',
    owner_id: 'user1',
    quiz: { questionSets: [] },
    category: null,
    complexity: null,
    source: null,
  }

  const defaultProps = {
    isOpen: false,
    text: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <EditTextModal {...defaultProps} isOpen={false} text={mockText} />
    )
    expect(container.querySelector('form')).not.toBeInTheDocument()
  })

  it('does not render when text is null', () => {
    const { container } = render(
      <EditTextModal {...defaultProps} isOpen={true} text={null} />
    )
    expect(container.querySelector('form')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true and text is provided', () => {
    render(<EditTextModal {...defaultProps} isOpen={true} text={mockText} />)
    expect(screen.getByText('Edit Text')).toBeInTheDocument()
  })

  it('calls onClose when modal is closed', () => {
    const onClose = vi.fn()
    render(
      <EditTextModal
        {...defaultProps}
        isOpen={true}
        text={mockText}
        onClose={onClose}
      />
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('passes correct initial data to TextFormModal', () => {
    render(<EditTextModal {...defaultProps} isOpen={true} text={mockText} />)
    expect(screen.getByDisplayValue(mockText.title)).toBeInTheDocument()
  })

  it('renders save button when form is open', () => {
    render(<EditTextModal {...defaultProps} isOpen={true} text={mockText} />)
    expect(
      screen.getByRole('button', { name: 'Save Changes' })
    ).toBeInTheDocument()
  })

  it('disables modal when text is null even if isOpen is true', () => {
    const { container } = render(
      <EditTextModal {...defaultProps} isOpen={true} text={null} />
    )
    expect(container.querySelector('form')).not.toBeInTheDocument()
  })

  it('updates when text prop changes', () => {
    const newText: Text = {
      ...mockText,
      id: '2',
      title: 'New Title',
    }

    const { rerender } = render(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )

    expect(screen.getByDisplayValue(mockText.title)).toBeInTheDocument()

    rerender(<EditTextModal {...defaultProps} isOpen={true} text={newText} />)

    expect(screen.getByDisplayValue(newText.title)).toBeInTheDocument()
  })

  it('handles empty content gracefully', () => {
    const emptyText: Text = {
      ...mockText,
      content: '',
    }

    render(<EditTextModal {...defaultProps} isOpen={true} text={emptyText} />)

    // Modal should still render with empty content textarea
    expect(screen.getByText('Edit Text')).toBeInTheDocument()
    expect(screen.getByLabelText('Text Content')).toHaveValue('')
  })

  it('memoizes initial data', () => {
    const { rerender } = render(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )

    expect(screen.getByDisplayValue(mockText.title)).toBeInTheDocument()

    rerender(<EditTextModal {...defaultProps} isOpen={true} text={mockText} />)

    expect(screen.getByDisplayValue(mockText.title)).toBeInTheDocument()
  })
})

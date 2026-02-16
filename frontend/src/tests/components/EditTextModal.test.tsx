import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditTextModal } from '../../components/EditTextModal'
import { AuthContext } from '../../context/authContext'
import { ROLE_ADMIN } from '../../constants/roles'
import type { Text } from '../../types/database'
import type { User, Session } from '@supabase/supabase-js'

const mockUser = { id: 'user-123', email: 'test@example.com' } as User
const mockSession = { user: mockUser } as Session

const renderWithAuth = (
  ui: React.ReactElement,
  { user = mockUser }: { user?: User | null } = {}
) => {
  return render(
    <AuthContext.Provider
      value={{
        user,
        session: user ? mockSession : null,
        loading: false,
        signOut: vi.fn(),
      }}
    >
      {ui}
    </AuthContext.Provider>
  )
}

describe('EditTextModal', () => {
  const mockText: Text = {
    id: '1',
    title: 'Test Title',
    content: 'Test content',
    summary: null,
    fiction: true,
    uploaded_at: '2026-01-01',
    owner_id: 'user1',
    quiz: { questionSets: [] },
    complexity: null,
    source: null,
    processing_status: 'pending',
    quiz_valid: true,
    llm_decision: null,
    llm_violation_type: null,
    admin_decision: null,
    admin_reviewed_by: null,
    admin_reviewed_at: null,
    rejection_reason: null,
    rejection_stage: null,
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
    const { container } = renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={false} text={mockText} />
    )
    expect(container.querySelector('form')).not.toBeInTheDocument()
  })

  it('does not render when text is null', () => {
    const { container } = renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={null} />
    )
    expect(container.querySelector('form')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true and text is provided', () => {
    renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )
    expect(screen.getByText('Edit Text & Quiz')).toBeInTheDocument()
  })

  it('does not call onClose on initial render', () => {
    const onClose = vi.fn()
    renderWithAuth(
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
    renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )
    expect(screen.getByDisplayValue(mockText.title || '')).toBeInTheDocument()
  })

  it('renders save button when form is open', () => {
    renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )
    expect(
      screen.getByRole('button', { name: 'Save Changes' })
    ).toBeInTheDocument()
  })

  it('disables modal when text is null even if isOpen is true', () => {
    const { container } = renderWithAuth(
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

    const { rerender } = renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )

    expect(screen.getByDisplayValue(mockText.title ?? '')).toBeInTheDocument()

    rerender(
      <AuthContext.Provider
        value={{
          user: mockUser,
          session: mockSession,
          loading: false,
          signOut: vi.fn(),
        }}
      >
        <EditTextModal {...defaultProps} isOpen={true} text={newText} />
      </AuthContext.Provider>
    )

    expect(screen.getByDisplayValue(newText.title ?? '')).toBeInTheDocument()
  })

  it('handles empty content gracefully', () => {
    const emptyText: Text = {
      ...mockText,
      content: '',
    }

    renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={emptyText} />
    )

    // Modal should still render with empty content textarea
    expect(screen.getByText('Edit Text & Quiz')).toBeInTheDocument()
    expect(screen.getByLabelText('Text Content')).toHaveValue('')
  })

  it('memoizes initial data', () => {
    const { rerender } = renderWithAuth(
      <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
    )

    expect(screen.getByDisplayValue(mockText.title ?? '')).toBeInTheDocument()

    rerender(
      <AuthContext.Provider
        value={{
          user: mockUser,
          session: mockSession,
          loading: false,
          signOut: vi.fn(),
        }}
      >
        <EditTextModal {...defaultProps} isOpen={true} text={mockText} />
      </AuthContext.Provider>
    )

    expect(screen.getByDisplayValue(mockText.title ?? '')).toBeInTheDocument()
  })

  describe('admin functionality', () => {
    const mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      user_metadata: { role: ROLE_ADMIN },
    } as unknown as User

    const privateText: Text = {
      ...mockText,
      owner_id: 'user-123', // Private text has an owner_id
    }

    const publicText: Text = {
      ...mockText,
      owner_id: null, // Public text has null owner_id
    }

    it('should not show Make Public button for non-admin users', () => {
      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={vi.fn()}
        />,
        { user: mockUser }
      )

      expect(
        screen.queryByRole('button', { name: /Make Public/i })
      ).not.toBeInTheDocument()
    })

    it('should not show Make Public button for admin editing public texts', () => {
      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={publicText}
          onMakePublicCopy={vi.fn()}
        />,
        { user: mockAdminUser }
      )

      expect(
        screen.queryByRole('button', { name: /Make Public/i })
      ).not.toBeInTheDocument()
    })

    it('should show Make Public button for admin editing private texts', () => {
      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={vi.fn()}
        />,
        { user: mockAdminUser }
      )

      expect(
        screen.getByRole('button', { name: 'Make Public' })
      ).toBeInTheDocument()
    })

    it('should call onMakePublicCopy when Make Public button is clicked', async () => {
      const mockOnMakePublicCopy = vi.fn().mockResolvedValueOnce(undefined)

      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={mockOnMakePublicCopy}
        />,
        { user: mockAdminUser }
      )

      const makePublicButton = screen.getByRole('button', {
        name: 'Make Public',
      })
      fireEvent.click(makePublicButton)

      await waitFor(() => {
        expect(mockOnMakePublicCopy).toHaveBeenCalledWith(privateText.id, {
          title: privateText.title,
          content: privateText.content,
          fiction: privateText.fiction,
          isPublic: true,
        })
      })
    })

    it('should disable Make Public button when content is empty', () => {
      const emptyText: Text = {
        ...privateText,
        content: '',
      }

      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={emptyText}
          onMakePublicCopy={vi.fn()}
        />,
        { user: mockAdminUser }
      )

      const makePublicButton = screen.getByRole('button', {
        name: 'Make Public',
      })
      expect(makePublicButton).toBeDisabled()
    })

    it('should show Creating Public Copy... when making public', async () => {
      const mockOnMakePublicCopy = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        )

      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={mockOnMakePublicCopy}
        />,
        { user: mockAdminUser }
      )

      const makePublicButton = screen.getByRole('button', {
        name: 'Make Public',
      })
      fireEvent.click(makePublicButton)

      expect(
        screen.getByRole('button', { name: 'Creating Public Copy...' })
      ).toBeInTheDocument()
    })

    it('should disable save button while making public copy', async () => {
      const mockOnMakePublicCopy = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        )

      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={mockOnMakePublicCopy}
        />,
        { user: mockAdminUser }
      )

      const makePublicButton = screen.getByRole('button', {
        name: 'Make Public',
      })
      fireEvent.click(makePublicButton)

      const saveButton = screen.getByRole('button', {
        name: /Save Changes/i,
      })
      expect(saveButton).toBeDisabled()
    })

    it('should not show Make Public button when onMakePublicCopy is not provided', () => {
      renderWithAuth(
        <EditTextModal {...defaultProps} isOpen={true} text={privateText} />,
        { user: mockAdminUser }
      )

      expect(
        screen.queryByRole('button', { name: /Make Public/i })
      ).not.toBeInTheDocument()
    })

    it('should call onMakePublicCopy with updated content from form', async () => {
      const mockOnMakePublicCopy = vi.fn().mockResolvedValueOnce(undefined)

      renderWithAuth(
        <EditTextModal
          {...defaultProps}
          isOpen={true}
          text={privateText}
          onMakePublicCopy={mockOnMakePublicCopy}
        />,
        { user: mockAdminUser }
      )

      // Modify the content
      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Updated content' } })

      const makePublicButton = screen.getByRole('button', {
        name: 'Make Public',
      })
      fireEvent.click(makePublicButton)

      await waitFor(() => {
        expect(mockOnMakePublicCopy).toHaveBeenCalledWith(privateText.id, {
          title: privateText.title,
          content: 'Updated content',
          fiction: privateText.fiction,
          isPublic: true,
        })
      })
    })
  })
})

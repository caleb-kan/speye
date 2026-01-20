import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UploadTextModal } from '../components/UploadTextModal'
import { AuthContext } from '../context/authContext'
import type { UploadTextInput } from '../../../backend/supabase/database/texts/uploadText'
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

describe('UploadTextModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  const renderModal = (
    props: Partial<{
      isOpen: boolean
      onClose: () => void
      onSubmit: (data: UploadTextInput) => Promise<void>
    }> = {},
    { user = mockUser }: { user?: User | null } = {}
  ) => {
    return renderWithAuth(
      <UploadTextModal
        isOpen={props.isOpen ?? true}
        onClose={props.onClose ?? mockOnClose}
        onSubmit={props.onSubmit ?? mockOnSubmit}
      />,
      { user }
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when closed', () => {
    it('should not render when isOpen is false', () => {
      renderModal({ isOpen: false })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('when open', () => {
    it('should render modal with title', () => {
      renderModal()

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Upload Text' })
      ).toBeInTheDocument()
    })

    it('should render text content textarea', () => {
      renderModal()

      expect(screen.getByLabelText('Text Content')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Paste or type your text here...')
      ).toBeInTheDocument()
    })

    it('should render category dropdown with Fiction and Non-Fiction options', () => {
      renderModal()

      const categorySelect = screen.getByLabelText('Category')
      expect(categorySelect).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Fiction' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Non-Fiction' })
      ).toBeInTheDocument()
    })

    it('should render visibility dropdown with Private and Public options', () => {
      renderModal()

      const visibilitySelect = screen.getByLabelText('Visibility')
      expect(visibilitySelect).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Private' })
      ).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Public' })).toBeInTheDocument()
    })

    it('should show character count', () => {
      renderModal()

      expect(screen.getByText('0 characters')).toBeInTheDocument()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Hello world' } })

      expect(screen.getByText('11 characters')).toBeInTheDocument()
    })

    it('should call onClose when cancel button is clicked', () => {
      renderModal()

      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when close icon is clicked', () => {
      renderModal()

      fireEvent.click(screen.getByLabelText('Close modal'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking backdrop', () => {
      renderModal()

      // The backdrop is the dialog element itself (the outer div with role="dialog")
      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should have upload button disabled when text is empty', () => {
      renderModal()

      const uploadButton = screen.getByRole('button', { name: 'Upload Text' })
      expect(uploadButton).toBeDisabled()
    })

    it('should enable upload button when text is entered', () => {
      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Some text content' } })

      const uploadButton = screen.getByRole('button', { name: 'Upload Text' })
      expect(uploadButton).not.toBeDisabled()
    })

    it('should show error when submitting empty text', async () => {
      renderModal()

      // Force enable the button by adding and removing text
      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.change(textarea, { target: { value: '   ' } })

      const form = screen.getByRole('dialog').querySelector('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter some text')).toBeInTheDocument()
      })
    })

    it('should call onSubmit with correct data when form is submitted', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)

      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'My test text content' } })

      const categorySelect = screen.getByLabelText('Category')
      fireEvent.change(categorySelect, { target: { value: 'non-fiction' } })

      const visibilitySelect = screen.getByLabelText('Visibility')
      fireEvent.change(visibilitySelect, { target: { value: 'public' } })

      const uploadButton = screen.getByRole('button', { name: 'Upload Text' })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'My test text content',
          fiction: false,
          isPublic: true,
        })
      })
    })

    it('should show error when user is not logged in', async () => {
      renderModal({}, { user: null })

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Some text' } })

      const form = screen.getByRole('dialog').querySelector('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(
          screen.getByText('You must be logged in to upload texts')
        ).toBeInTheDocument()
      })
    })

    it('should show visibility helper text based on selection', () => {
      renderModal()

      // Default is private
      expect(
        screen.getByText('Only you can read this text')
      ).toBeInTheDocument()

      const visibilitySelect = screen.getByLabelText('Visibility')
      fireEvent.change(visibilitySelect, { target: { value: 'public' } })

      expect(screen.getByText('Anyone can read this text')).toBeInTheDocument()
    })
  })
})

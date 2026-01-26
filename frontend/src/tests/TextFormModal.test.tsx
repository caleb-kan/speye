import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TextFormModal } from '../components/TextFormModal'

describe('TextFormModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when closed', () => {
    it('should not render when isOpen is false', () => {
      render(
        <TextFormModal
          isOpen={false}
          mode="upload"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('upload mode', () => {
    const renderUploadModal = () => {
      return render(
        <TextFormModal
          isOpen={true}
          mode="upload"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )
    }

    it('should render with Upload Text title', () => {
      renderUploadModal()

      expect(
        screen.getByRole('heading', { name: 'Upload Text' })
      ).toBeInTheDocument()
    })

    it('should show auto-generate hint for title', () => {
      renderUploadModal()

      expect(
        screen.getByText('Leave blank to auto-generate from content')
      ).toBeInTheDocument()
    })

    it('should render Upload Text button', () => {
      renderUploadModal()

      expect(
        screen.getByRole('button', { name: 'Upload Text' })
      ).toBeInTheDocument()
    })

    it('should show Uploading... when submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      renderUploadModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Some text' } })

      const uploadButton = screen.getByRole('button', { name: 'Upload Text' })
      fireEvent.click(uploadButton)

      expect(
        screen.getByRole('button', { name: 'Uploading...' })
      ).toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    const initialData = {
      title: 'Test Title',
      content: 'Test content here',
      fiction: false,
    }

    const renderEditModal = (data = initialData) => {
      return render(
        <TextFormModal
          isOpen={true}
          mode="edit"
          initialData={data}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )
    }

    it('should render with Edit Text title', () => {
      renderEditModal()

      expect(
        screen.getByRole('heading', { name: 'Edit Text' })
      ).toBeInTheDocument()
    })

    it('should show auto-generate hint for title', () => {
      renderEditModal()

      expect(
        screen.getByText('Leave blank to auto-generate from content')
      ).toBeInTheDocument()
    })

    it('should render Save Changes button', () => {
      renderEditModal()

      expect(
        screen.getByRole('button', { name: 'Save Changes' })
      ).toBeInTheDocument()
    })

    it('should pre-populate form with initial data', () => {
      renderEditModal()

      expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test content here')).toBeInTheDocument()
      expect(screen.getByLabelText('Genre')).toHaveValue('non-fiction')
    })

    it('should show Saving... when submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      renderEditModal()

      const saveButton = screen.getByRole('button', { name: 'Save Changes' })
      fireEvent.click(saveButton)

      expect(
        screen.getByRole('button', { name: 'Saving...' })
      ).toBeInTheDocument()
    })

    it('should handle null title in initial data', () => {
      renderEditModal({ title: null, content: 'Content', fiction: true })

      const titleInput = screen.getByPlaceholderText('Enter a title...')
      expect(titleInput).toHaveValue('')
    })
  })

  describe('common functionality', () => {
    const renderModal = (mode: 'upload' | 'edit' = 'upload') => {
      return render(
        <TextFormModal
          isOpen={true}
          mode={mode}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )
    }

    it('should render title input field', () => {
      renderModal()

      expect(screen.getByLabelText(/Title/)).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Enter a title...')
      ).toBeInTheDocument()
    })

    it('should render text content textarea', () => {
      renderModal()

      expect(screen.getByLabelText('Text Content')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Paste or type your text here...')
      ).toBeInTheDocument()
    })

    it('should render genre dropdown', () => {
      renderModal()

      const categorySelect = screen.getByLabelText('Genre')
      expect(categorySelect).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Fiction' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Non-Fiction' })
      ).toBeInTheDocument()
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

      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when ESC key is pressed', () => {
      renderModal()

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should have submit button disabled when text is empty', () => {
      renderModal()

      const submitButton = screen.getByRole('button', { name: 'Upload Text' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when text is entered', () => {
      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Some text content' } })

      const submitButton = screen.getByRole('button', { name: 'Upload Text' })
      expect(submitButton).not.toBeDisabled()
    })

    it('should show error when submitting empty text', async () => {
      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.change(textarea, { target: { value: '   ' } })

      const form = screen.getByRole('dialog').querySelector('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter some text')).toBeInTheDocument()
      })
    })

    it('should call onSubmit with correct data', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      renderModal()

      const titleInput = screen.getByPlaceholderText('Enter a title...')
      fireEvent.change(titleInput, { target: { value: 'My Test Title' } })

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'My test text content' } })

      const categorySelect = screen.getByLabelText('Genre')
      fireEvent.change(categorySelect, { target: { value: 'non-fiction' } })

      const submitButton = screen.getByRole('button', { name: 'Upload Text' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'My Test Title',
          content: 'My test text content',
          fiction: false,
        })
      })
    })

    it('should submit null title when title is empty', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)
      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Content without title' } })

      const submitButton = screen.getByRole('button', { name: 'Upload Text' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: null,
          content: 'Content without title',
          fiction: true,
        })
      })
    })

    it('should show error when onSubmit throws', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Save failed'))
      renderModal()

      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'Some text' } })

      const submitButton = screen.getByRole('button', { name: 'Upload Text' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })
    })

    it('should clear error when modal reopens', async () => {
      const { rerender } = render(
        <TextFormModal
          isOpen={true}
          mode="upload"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      // Trigger an error
      const textarea = screen.getByLabelText('Text Content')
      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.change(textarea, { target: { value: '   ' } })
      const form = screen.getByRole('dialog').querySelector('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Please enter some text')).toBeInTheDocument()
      })

      // Close modal
      rerender(
        <TextFormModal
          isOpen={false}
          mode="upload"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      // Reopen modal
      rerender(
        <TextFormModal
          isOpen={true}
          mode="upload"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      // Error should be cleared
      expect(
        screen.queryByText('Please enter some text')
      ).not.toBeInTheDocument()
    })
  })
})

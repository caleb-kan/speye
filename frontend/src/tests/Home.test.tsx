import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Home } from '../pages/Home.tsx'
import * as useTextsModule from '../hooks/useTexts.ts'
import type { Text } from '../types/database.ts'
import '@testing-library/jest-dom'

vi.mock('../hooks/useTexts')
Element.prototype.scrollTo = vi.fn()
window.scrollTo = vi.fn()

const mockUseTexts = vi.mocked(useTextsModule.useTexts)

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

const mockDefaultUseTexts = () => {
  mockUseTexts.mockReturnValue({
    texts: [],
    currentText: null,
    loading: false,
    error: null,
    selectRandomText: vi.fn(),
    refetch: vi.fn(),
  })
}

const createMockText = (content: string): Text => ({
  id: '1',
  content,
  is_public: true,
  uploaded_at: new Date().toISOString(),
  owner_id: null,
  quiz: null,
  fiction: false,
  category: null,
  readability: null,
})

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders the logo text', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('sp(eye)')).toBeInTheDocument()
    })

    it('logo links to home page', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('link', { name: 'sp(eye)' })).toHaveAttribute(
        'href',
        '/home'
      )
    })
  })

  describe('Loading State', () => {
    it('displays loading message when fetching texts', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: true,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('Loading texts...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    beforeEach(() => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: 'Network error',
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })
    })

    it('displays error message', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('displays "Try again" button', () => {
      renderWithRouter(<Home />)

      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument()
    })

    it('clicking "Try again" calls refetch', async () => {
      const mockRefetch = vi.fn()
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: 'Network error',
        selectRandomText: vi.fn(),
        refetch: mockRefetch,
      })

      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('displays "No texts available" message', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('No texts available')).toBeInTheDocument()
    })
  })

  describe('OptionsBar - Mode Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders mode label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('mode:')).toBeInTheDocument()
    })

    it('renders all mode buttons', () => {
      renderWithRouter(<Home />)

      expect(
        screen.getByRole('button', { name: /standard/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /adaptive/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /summarized/i })
      ).toBeInTheDocument()
    })

    it('standard mode is selected by default', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('button', { name: /standard/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /adaptive/i })).not.toHaveClass(
        'text-primary'
      )
      expect(
        screen.getByRole('button', { name: /summarized/i })
      ).not.toHaveClass('text-primary')
    })

    it('adaptive and summarized modes are disabled', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('button', { name: /adaptive/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /summarized/i })).toBeDisabled()
    })
  })

  describe('OptionsBar - Genre Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders genre label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('genre:')).toBeInTheDocument()
    })

    it('non-fiction is selected by default', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('button', { name: /non-fiction/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /^fiction/i })).not.toHaveClass(
        'text-primary'
      )
    })

    it('clicking fiction changes the selected genre', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /^fiction/i }))

      expect(screen.getByRole('button', { name: /^fiction/i })).toHaveClass(
        'text-primary'
      )
      expect(
        screen.getByRole('button', { name: /non-fiction/i })
      ).not.toHaveClass('text-primary')
    })

    it('calls useTexts with fiction = false on initial render', () => {
      renderWithRouter(<Home />)

      expect(mockUseTexts).toHaveBeenCalledWith({ fiction: false })
    })

    it('calls useTexts with fiction = true after selecting fiction', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /^fiction/i }))

      expect(mockUseTexts).toHaveBeenLastCalledWith({ fiction: true })
    })
  })

  describe('OptionsBar - Reading Type Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders type label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('type:')).toBeInTheDocument()
    })

    it('dynamic is selected by default', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('button', { name: /dynamic/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /static/i })).not.toHaveClass(
        'text-primary'
      )
    })

    it('clicking static changes the selected type', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /static/i }))

      expect(screen.getByRole('button', { name: /static/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /dynamic/i })).not.toHaveClass(
        'text-primary'
      )
    })
  })

  describe('OptionsBar - Blur Toggle', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders blur label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('blur:')).toBeInTheDocument()
    })

    it('blur is off by default', () => {
      renderWithRouter(<Home />)

      expect(
        screen.getByRole('button', { name: /blur unread text/i })
      ).toHaveTextContent('off')
    })

    it('clicking blur button toggles it on', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      const blurButton = screen.getByRole('button', {
        name: /blur unread text/i,
      })
      await user.click(blurButton)

      expect(blurButton).toHaveTextContent('on')
      expect(blurButton).toHaveClass('text-primary')
    })

    it('clicking blur button twice toggles it back off', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      const blurButton = screen.getByRole('button', {
        name: /blur unread text/i,
      })
      await user.click(blurButton)
      await user.click(blurButton)

      expect(blurButton).toHaveTextContent('off')
    })
  })

  describe('OptionsBar - WPM Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders WPM label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('wpm:')).toBeInTheDocument()
    })

    it('renders all preset WPM buttons', () => {
      renderWithRouter(<Home />)
      ;[100, 200, 300, 400].forEach((preset) => {
        expect(
          screen.getByRole('button', { name: new RegExp(`${preset} words`) })
        ).toBeInTheDocument()
      })
    })

    it('200 WPM is selected by default', () => {
      renderWithRouter(<Home />)

      expect(screen.getByRole('button', { name: /200 words/ })).toHaveClass(
        'text-primary'
      )
    })

    it('clicking a WPM button changes the selection', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /300 words/ }))

      expect(screen.getByRole('button', { name: /300 words/ })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /200 words/ })).not.toHaveClass(
        'text-primary'
      )
    })

    it('renders custom WPM control', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText(/custom:/i)).toBeInTheDocument()
    })

    it('clicking custom control shows input field', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))

      expect(
        screen.getByRole('textbox', { name: 'Custom words per minute value' })
      ).toBeInTheDocument()
    })

    it('custom WPM input accepts valid values', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '350'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText('350')).toBeInTheDocument()
    })

    it('custom WPM values below 10 are clamped to 10', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '5'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('custom WPM values above 2000 are clamped to 2000', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '5000'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText('2000')).toBeInTheDocument()
    })

    it('pressing Escape cancels custom WPM input', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '999'
      )
      await user.keyboard('{Escape}')

      expect(
        screen.queryByRole('textbox', { name: 'Custom words per minute value' })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /200 words/ })).toHaveClass(
        'text-primary'
      )
    })

    it('empty input reverts to previous WPM', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: /custom/i }))
      expect(
        screen.getByRole('textbox', { name: 'Custom words per minute value' })
      ).toBeInTheDocument()

      await user.keyboard('{Enter}')

      expect(
        screen.queryByRole('textbox', { name: 'Custom words per minute value' })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /200 words/ })).toHaveClass(
        'text-primary'
      )
    })
  })

  describe('Reader Integration', () => {
    it('renders text content when available', () => {
      const mockText = createMockText('Hello world testing')
      mockUseTexts.mockReturnValue({
        texts: [mockText],
        currentText: mockText,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('world')).toBeInTheDocument()
      expect(screen.getByText('testing')).toBeInTheDocument()
    })

    it('renders "New text" button when text is available', () => {
      const mockText = createMockText('Test content')
      mockUseTexts.mockReturnValue({
        texts: [mockText],
        currentText: mockText,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(
        screen.getByRole('button', { name: 'New text' })
      ).toBeInTheDocument()
    })

    it('clicking "New text" calls selectRandomText', async () => {
      const mockSelectRandomText = vi.fn()
      const mockText = createMockText('Test content')
      mockUseTexts.mockReturnValue({
        texts: [mockText],
        currentText: mockText,
        loading: false,
        error: null,
        selectRandomText: mockSelectRandomText,
        refetch: vi.fn(),
      })

      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByRole('button', { name: 'New text' }))

      expect(mockSelectRandomText).toHaveBeenCalledTimes(1)
    })
  })
})

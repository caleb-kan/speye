import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Home } from '../pages/Home.tsx'
import * as useTextsModule from '../hooks/useTexts.ts'
import type { Text } from '../lib/supabase.ts'

vi.mock('../hooks/useTexts')

const mockUseTexts = vi.mocked(useTextsModule.useTexts)

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    // Verifies the main logo text is rendered in the header
    it('renders the logo text "sp(eye)"', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('sp(eye)')).toBeInTheDocument()
    })

    // Verifies the settings link is visible and present in the header
    it('renders the settings link', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      const settingsLink = screen.getByText('settings')
      expect(settingsLink).toBeInTheDocument()
      expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings')
    })

    // Verifies the logo acts as a link back to the home page
    it('logo links to home page', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      const logoLink = screen.getByText('sp(eye)').closest('a')
      expect(logoLink).toHaveAttribute('href', '/')
    })
  })

  describe('Loading State', () => {
    // Verifies a loading message is shown while texts are being fetched
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
    // Verifies the error message is displayed when the hook reports an error
    it('displays error message when there is an error', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: 'Failed to fetch texts',
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('Failed to fetch texts')).toBeInTheDocument()
    })

    // Verifies a retry button is shown when the hook reports an error
    it('displays "Try again" button when there is an error', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: 'Network error',
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    // Verifies the empty state message is shown when there are no texts
    it('displays "No texts available" when texts array is empty', () => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      expect(screen.getByText('No texts available')).toBeInTheDocument()
    })
  })

  describe('SettingsBar - Mode Selection', () => {
    // Reset useTexts mock before each mode selection test
    beforeEach(() => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })
    })

    // Verifies all three mode buttons are rendered
    it('renders mode selection buttons', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('standard')).toBeInTheDocument()
      expect(screen.getByText('adaptive')).toBeInTheDocument()
      expect(screen.getByText('summarized')).toBeInTheDocument()
    })

    // Verifies that "standard" mode is the default active mode
    it('standard mode is selected by default', () => {
      renderWithRouter(<Home />)

      const standardButton = screen.getByText('standard')
      expect(standardButton).toHaveClass('text-[var(--color-primary)]')
    })

    // Verifies that adaptive and summarized modes are disabled by default
    it('adaptive and summarized modes are disabled', () => {
      renderWithRouter(<Home />)

      const adaptiveButton = screen.getByText('adaptive').closest('button')
      const summarizedButton = screen.getByText('summarized').closest('button')

      expect(adaptiveButton).toBeDisabled()
      expect(summarizedButton).toBeDisabled()
    })
  })

  describe('SettingsBar - WPM Selection', () => {
    // Reset useTexts mock before each WPM selection test
    beforeEach(() => {
      mockUseTexts.mockReturnValue({
        texts: [],
        currentText: null,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })
    })

    // Verifies the "wpm:" label is displayed next to the controls
    it('renders WPM label', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('wpm:')).toBeInTheDocument()
    })

    // Verifies all preset WPM buttons are rendered
    it('renders all WPM preset buttons', () => {
      renderWithRouter(<Home />)

      const presets = [100, 200, 300, 400]
      presets.forEach((preset) => {
        expect(screen.getByText(preset.toString())).toBeInTheDocument()
      })
    })

    // Verifies that 200 WPM is selected by default
    it('200 WPM is selected by default', () => {
      renderWithRouter(<Home />)

      const wpm200Button = screen.getByText('200')
      expect(wpm200Button).toHaveClass('text-[var(--color-primary)]')
    })

    // Verifies that clicking another preset WPM changes the selection
    it('clicking a WPM button changes the selection', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      const wpm300Button = screen.getByText('300')
      await user.click(wpm300Button)

      expect(wpm300Button).toHaveClass('text-[var(--color-primary)]')
    })

    // Verifies the custom WPM button is rendered
    it('renders custom WPM button', () => {
      renderWithRouter(<Home />)

      expect(screen.getByText('custom')).toBeInTheDocument()
    })

    // Verifies that clicking the custom button reveals the numeric input
    it('clicking custom button shows input field', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      const customButton = screen.getByText('custom')
      await user.click(customButton)

      // Input should be visible (no placeholder, just a number input)
      const input = screen.getByRole('spinbutton')
      expect(input).toBeInTheDocument()
    })

    // Verifies that entering a valid custom WPM value is accepted and reflected in the UI
    it('custom WPM input accepts valid values', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Home />)

      await user.click(screen.getByText('custom'))

      const input = screen.getByRole('spinbutton')
      await user.type(input, '350')
      await user.keyboard('{Enter}')

      // After entering custom WPM, it should show the value instead of "custom"
      expect(screen.getByText('350')).toBeInTheDocument()
    })
  })

  describe('Reader Integration', () => {
    // Verifies the Reader text display renders when useTexts returns a current text
    it('renders Reader component when text is available', () => {
      const mockText: Text = {
        id: '1',
        content: 'Hello world testing',
        is_public: true,
        uploaded_at: new Date().toISOString(),
        owner_id: null,
        quiz: null,
      }

      mockUseTexts.mockReturnValue({
        texts: [mockText],
        currentText: mockText,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      // Words are rendered in separate spans, so check for individual words
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('world')).toBeInTheDocument()
      expect(screen.getByText('testing')).toBeInTheDocument()
    })

    // Verifies the Reader controls (like new text button) are available when text exists
    it('renders play/pause controls when text is available', () => {
      const mockText: Text = {
        id: '1',
        content: 'Test content here',
        is_public: true,
        uploaded_at: new Date().toISOString(),
        owner_id: null,
        quiz: null,
      }

      mockUseTexts.mockReturnValue({
        texts: [mockText],
        currentText: mockText,
        loading: false,
        error: null,
        selectRandomText: vi.fn(),
        refetch: vi.fn(),
      })

      renderWithRouter(<Home />)

      // Should have a new text button (uses aria-label)
      expect(
        screen.getByRole('button', { name: 'New text' })
      ).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as useTextsModule from '../hooks/useTexts.ts'
import '@testing-library/jest-dom'
import { renderWithReadingLayout } from './renderLayouts.tsx'
import {
  DEFAULT_MIN_COMPLEXITY,
  DEFAULT_MAX_COMPLEXITY,
} from '../constants/complexity'
import { WPM_PRESETS, DEFAULT_WPM, MIN_WPM, MAX_WPM } from '../constants/wpm'

vi.mock('../hooks/useTexts')
vi.mock('../hooks/useAuth', () => ({
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

describe('OptionsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Mode Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders mode label', () => {
      renderWithReadingLayout()

      expect(screen.getByText('mode:')).toBeInTheDocument()
    })

    it('renders all mode buttons', () => {
      renderWithReadingLayout()

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
      renderWithReadingLayout()

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
      renderWithReadingLayout()

      expect(screen.getByRole('button', { name: /adaptive/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /summarized/i })).toBeDisabled()
    })
  })

  describe('Genre Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders genre label', () => {
      renderWithReadingLayout()

      expect(screen.getByText('genre:')).toBeInTheDocument()
    })

    it('non-fiction is selected by default', () => {
      renderWithReadingLayout()

      expect(screen.getByRole('button', { name: /non-fiction/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /^fiction/i })).not.toHaveClass(
        'text-primary'
      )
    })

    it('clicking fiction changes the selected genre', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /^fiction/i }))

      expect(screen.getByRole('button', { name: /^fiction/i })).toHaveClass(
        'text-primary'
      )
      expect(
        screen.getByRole('button', { name: /non-fiction/i })
      ).not.toHaveClass('text-primary')
    })

    it('calls useTexts with fiction = false on initial render', () => {
      renderWithReadingLayout()

      expect(mockUseTexts).toHaveBeenCalledWith({
        fiction: false,
        complexityMin: DEFAULT_MIN_COMPLEXITY,
        complexityMax: DEFAULT_MAX_COMPLEXITY,
      })
    })

    it('calls useTexts with fiction = true after selecting fiction', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /^fiction/i }))

      expect(mockUseTexts).toHaveBeenLastCalledWith({
        fiction: true,
        complexityMin: DEFAULT_MIN_COMPLEXITY,
        complexityMax: DEFAULT_MAX_COMPLEXITY,
      })
    })
  })

  describe('Scrolling Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders scrolling label', () => {
      renderWithReadingLayout()

      expect(screen.getByText('scrolling:')).toBeInTheDocument()
    })

    it('dynamic is selected by default', () => {
      renderWithReadingLayout()

      expect(screen.getByRole('button', { name: /dynamic/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /static/i })).not.toHaveClass(
        'text-primary'
      )
    })

    it('clicking static changes the selected type', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /static/i }))

      expect(screen.getByRole('button', { name: /static/i })).toHaveClass(
        'text-primary'
      )
      expect(screen.getByRole('button', { name: /dynamic/i })).not.toHaveClass(
        'text-primary'
      )
    })
  })

  describe('Blur Toggle', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders blur label', () => {
      renderWithReadingLayout()

      expect(screen.getByText('blur:')).toBeInTheDocument()
    })

    it('blur is off by default', () => {
      renderWithReadingLayout()

      expect(
        screen.getByRole('button', { name: /blur unread text/i })
      ).toHaveTextContent('off')
    })

    it('clicking blur button toggles it on', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      const blurButton = screen.getByRole('button', {
        name: /blur unread text/i,
      })
      await user.click(blurButton)

      expect(blurButton).toHaveTextContent('on')
      expect(blurButton).toHaveClass('text-primary')
    })

    it('clicking blur button twice toggles it back off', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      const blurButton = screen.getByRole('button', {
        name: /blur unread text/i,
      })
      await user.click(blurButton)
      await user.click(blurButton)

      expect(blurButton).toHaveTextContent('off')
    })
  })

  describe('WPM Selection', () => {
    beforeEach(() => {
      mockDefaultUseTexts()
    })

    it('renders WPM label', () => {
      renderWithReadingLayout()

      expect(screen.getByText('wpm:')).toBeInTheDocument()
    })

    it('renders all preset WPM buttons', () => {
      renderWithReadingLayout()
      WPM_PRESETS.forEach((preset) => {
        expect(
          screen.getByRole('button', { name: new RegExp(`${preset} words`) })
        ).toBeInTheDocument()
      })
    })

    it(`${DEFAULT_WPM} WPM is selected by default`, () => {
      renderWithReadingLayout()

      expect(
        screen.getByRole('button', { name: new RegExp(`${DEFAULT_WPM} words`) })
      ).toHaveClass('text-primary')
    })

    it('clicking a WPM button changes the selection', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      // Click a different preset than the default
      const differentPreset = WPM_PRESETS.find((p) => p !== DEFAULT_WPM)!
      await user.click(
        screen.getByRole('button', {
          name: new RegExp(`${differentPreset} words`),
        })
      )

      expect(
        screen.getByRole('button', {
          name: new RegExp(`${differentPreset} words`),
        })
      ).toHaveClass('text-primary')
      expect(
        screen.getByRole('button', { name: new RegExp(`${DEFAULT_WPM} words`) })
      ).not.toHaveClass('text-primary')
    })

    it('renders custom WPM control', () => {
      renderWithReadingLayout()

      expect(screen.getByText(/custom:/i)).toBeInTheDocument()
    })

    it('clicking custom control shows input field', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))

      expect(
        screen.getByRole('textbox', { name: 'Custom words per minute value' })
      ).toBeInTheDocument()
    })

    it('custom WPM input accepts valid values', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '350'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText('350')).toBeInTheDocument()
    })

    it(`custom WPM values below ${MIN_WPM} are clamped to ${MIN_WPM}`, async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '5'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText(String(MIN_WPM))).toBeInTheDocument()
    })

    it(`custom WPM values above ${MAX_WPM} are clamped to ${MAX_WPM}`, async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '5000'
      )
      await user.keyboard('{Enter}')

      expect(screen.getByText(String(MAX_WPM))).toBeInTheDocument()
    })

    it('pressing Escape cancels custom WPM input', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))
      await user.type(
        screen.getByRole('textbox', { name: 'Custom words per minute value' }),
        '999'
      )
      await user.keyboard('{Escape}')

      expect(
        screen.queryByRole('textbox', { name: 'Custom words per minute value' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: new RegExp(`${DEFAULT_WPM} words`) })
      ).toHaveClass('text-primary')
    })

    it('empty input reverts to previous WPM', async () => {
      const user = userEvent.setup()
      renderWithReadingLayout()

      await user.click(screen.getByRole('button', { name: /custom/i }))
      expect(
        screen.getByRole('textbox', { name: 'Custom words per minute value' })
      ).toBeInTheDocument()

      await user.keyboard('{Enter}')

      expect(
        screen.queryByRole('textbox', { name: 'Custom words per minute value' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: new RegExp(`${DEFAULT_WPM} words`) })
      ).toHaveClass('text-primary')
    })
  })
})

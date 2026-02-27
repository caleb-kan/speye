import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { RsvpShell } from '../../components/rsvp/RsvpShell'
import { STORAGE_KEYS } from '../../constants/storage'

let mockIsMobile = false

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

vi.mock('../../components/OptionsBar', () => ({
  OptionsBar: () => <div data-testid="options-bar">OptionsBar</div>,
}))

vi.mock('../../components/optionsBar/MobileRsvpOptionsBar', () => ({
  MobileRsvpOptionsBar: () => (
    <div data-testid="mobile-rsvp-options-bar">MobileRsvpOptionsBar</div>
  ),
}))

// Minimal props that satisfy OptionsBar's type
const stubOptionsBarProps = {
  wpm: 200,
  onWpmChange: vi.fn(),
  mode: 'rsvp' as const,
  onModeChange: vi.fn(),
  fiction: false,
  onFictionChange: vi.fn(),
  complexityMin: 1,
  complexityMax: 10,
  onComplexityMinChange: vi.fn(),
  onComplexityMaxChange: vi.fn(),
  visibleLines: 3,
  onVisibleLinesChange: vi.fn(),
  phraseSize: 20,
  onPhraseSizeChange: vi.fn(),
}

// Mock localStorage since jsdom may not provide full support
const localStorageStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(
      (key) => delete localStorageStore[key]
    )
  }),
  key: vi.fn(),
  length: 0,
}

vi.stubGlobal('localStorage', mockLocalStorage)

describe('RsvpShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
    Object.keys(localStorageStore).forEach(
      (key) => delete localStorageStore[key]
    )
  })

  describe('desktop', () => {
    it('renders OptionsBar, not MobileRsvpOptionsBar', () => {
      mockIsMobile = false
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      expect(screen.getByTestId('options-bar')).toBeInTheDocument()
      expect(
        screen.queryByTestId('mobile-rsvp-options-bar')
      ).not.toBeInTheDocument()
    })

    it('does not show toggle button', () => {
      mockIsMobile = false
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      expect(
        screen.queryByTestId('rsvp-options-toggle')
      ).not.toBeInTheDocument()
    })

    it('renders children', () => {
      mockIsMobile = false
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>child content</div>
        </RsvpShell>
      )
      expect(screen.getByText('child content')).toBeInTheDocument()
    })
  })

  describe('mobile', () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it('renders MobileRsvpOptionsBar, not OptionsBar', () => {
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      expect(screen.getByTestId('mobile-rsvp-options-bar')).toBeInTheDocument()
      expect(screen.queryByTestId('options-bar')).not.toBeInTheDocument()
    })

    it('shows "options" text when collapsed', () => {
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      expect(screen.getByTestId('rsvp-options-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('rsvp-options-toggle')).toHaveTextContent(
        'options'
      )
    })

    it('shows "hide options" text when expanded', async () => {
      const user = userEvent.setup()
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )

      await user.click(screen.getByTestId('rsvp-options-toggle'))
      expect(screen.getByTestId('rsvp-options-toggle')).toHaveTextContent(
        'hide options'
      )
    })

    it('persists toggle state to localStorage', async () => {
      const user = userEvent.setup()
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )

      await user.click(screen.getByTestId('rsvp-options-toggle'))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.RSVP_OPTIONS_OPEN,
        'true'
      )

      await user.click(screen.getByTestId('rsvp-options-toggle'))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.RSVP_OPTIONS_OPEN,
        'false'
      )
    })

    it('collapsed state has max-h-0 and opacity-0 classes', () => {
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      const wrapper = screen.getByTestId('rsvp-options-wrapper')
      expect(wrapper).toHaveClass('max-h-0')
      expect(wrapper).toHaveClass('opacity-0')
    })

    it('expanded state has max-h-67 and opacity-100 classes', async () => {
      const user = userEvent.setup()
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )

      await user.click(screen.getByTestId('rsvp-options-toggle'))
      const wrapper = screen.getByTestId('rsvp-options-wrapper')
      expect(wrapper).toHaveClass('max-h-67')
      expect(wrapper).toHaveClass('opacity-100')
    })

    it('respects localStorage initial state on mount', () => {
      localStorageStore[STORAGE_KEYS.RSVP_OPTIONS_OPEN] = 'true'
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>content</div>
        </RsvpShell>
      )
      expect(screen.getByTestId('rsvp-options-toggle')).toHaveTextContent(
        'hide options'
      )
    })

    it('renders children', () => {
      render(
        <RsvpShell optionsBarProps={stubOptionsBarProps}>
          <div>mobile child</div>
        </RsvpShell>
      )
      expect(screen.getByText('mobile child')).toBeInTheDocument()
    })
  })
})

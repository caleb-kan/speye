import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reader } from '../components/Reader'
import * as useReaderModule from '../hooks/useReader'
import '@testing-library/jest-dom'

vi.mock('../hooks/useReader')
vi.mock('../components/TextDisplay', () => ({
  TextDisplay: () => <div data-testid="text-display">Text Display</div>,
}))
vi.mock('../components/ReadingControls', () => ({
  ReadingControls: () => <div data-testid="reading-controls">Controls</div>,
}))
vi.mock('../components/Resizable', () => ({
  Resizable: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

const mockUseReader = vi.mocked(useReaderModule.useReader)

const baseMockReturn = {
  currentWordIndex: 0,
  isPlaying: false,
  isComplete: false,
  totalWords: 10,
  progress: 0,
  togglePlayPause: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  restart: vi.fn(),
  hasText: true,
}

describe('Reader Component', () => {
  const defaultProps = {
    title: null,
    text: 'Sample text',
    source: null,
    wpm: 300,
    scrolling: 'dynamic' as const,
    blurEnabled: false,
    onNewText: vi.fn(),
    textWidthPercent: 100,
    onTextWidthChange: vi.fn(),
    visibleLines: 3,
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReader.mockReturnValue(baseMockReturn)
  })

  it('renders child components correctly', () => {
    render(<Reader {...defaultProps} />)
    expect(screen.getByTestId('text-display')).toBeInTheDocument()
    expect(screen.getByTestId('reading-controls')).toBeInTheDocument()
  })

  describe('Completion Callback', () => {
    it('calls onComplete(true) when useReader reports completion', () => {
      mockUseReader.mockReturnValue({
        ...baseMockReturn,
        isComplete: true,
      })

      render(<Reader {...defaultProps} />)

      expect(defaultProps.onComplete).toHaveBeenCalledWith(true)
    })

    it('calls onComplete(false) when useReader resets (e.g. on restart)', () => {
      const { rerender } = render(<Reader {...defaultProps} />)

      mockUseReader.mockReturnValue({
        ...baseMockReturn,
        isComplete: false,
      })

      rerender(<Reader {...defaultProps} />)

      expect(defaultProps.onComplete).toHaveBeenCalledWith(false)
    })

    it('does not crash if onComplete prop is undefined', () => {
      const propsWithoutCallback = { ...defaultProps, onComplete: undefined }

      mockUseReader.mockReturnValue({
        ...baseMockReturn,
        isComplete: true,
      })

      expect(() => render(<Reader {...propsWithoutCallback} />)).not.toThrow()
    })
  })
})

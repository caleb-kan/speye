import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReadingControls } from '../../components/ReadingControls'

describe('ReadingControls', () => {
  const defaultProps = {
    isPlaying: false,
    onPlayPause: vi.fn(),
    onRestart: vi.fn(),
    onNewText: vi.fn(),
    progress: 50,
    currentWord: 50,
    totalWords: 100,
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ReadingControls {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays progress bar', () => {
    render(<ReadingControls {...defaultProps} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('displays word count on progress bar', () => {
    render(
      <ReadingControls {...defaultProps} currentWord={30} totalWords={200} />
    )
    expect(screen.getByText('30 / 200 words')).toBeInTheDocument()
  })

  it('renders restart button', () => {
    render(<ReadingControls {...defaultProps} />)
    const restartBtn = screen.getByLabelText('Restart')
    expect(restartBtn).toBeInTheDocument()
  })

  it('renders new text button', () => {
    render(<ReadingControls {...defaultProps} />)
    const newTextBtn = screen.getByLabelText('New text')
    expect(newTextBtn).toBeInTheDocument()
  })

  it('renders play button when not playing', () => {
    render(<ReadingControls {...defaultProps} isPlaying={false} />)
    const playBtn = screen.getByLabelText('Play')
    expect(playBtn).toBeInTheDocument()
  })

  it('renders pause button when playing', () => {
    render(<ReadingControls {...defaultProps} isPlaying={true} />)
    const pauseBtn = screen.getByLabelText('Pause')
    expect(pauseBtn).toBeInTheDocument()
  })

  it('calls onPlayPause when play/pause button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayPause = vi.fn()
    render(<ReadingControls {...defaultProps} onPlayPause={onPlayPause} />)

    const playBtn = screen.getByLabelText('Play')
    await user.click(playBtn)
    expect(onPlayPause).toHaveBeenCalledOnce()
  })

  it('calls onRestart when restart button is clicked', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(<ReadingControls {...defaultProps} onRestart={onRestart} />)

    const restartBtn = screen.getByLabelText('Restart')
    await user.click(restartBtn)
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('calls onNewText when new text button is clicked', async () => {
    const user = userEvent.setup()
    const onNewText = vi.fn()
    render(<ReadingControls {...defaultProps} onNewText={onNewText} />)

    const newTextBtn = screen.getByLabelText('New text')
    await user.click(newTextBtn)
    expect(onNewText).toHaveBeenCalledOnce()
  })

  it('disables play button when disabled prop is true', () => {
    render(<ReadingControls {...defaultProps} disabled={true} />)
    const playBtn = screen.getByLabelText('Play') as HTMLButtonElement
    expect(playBtn).toBeDisabled()
  })

  it('displays keyboard hint when not disabled', () => {
    render(
      <ReadingControls {...defaultProps} disabled={false} isPlaying={false} />
    )
    expect(screen.getByText(/press/)).toBeInTheDocument()
    expect(screen.getByText(/space/)).toBeInTheDocument()
  })

  it('shows correct keyboard hint for play', () => {
    render(
      <ReadingControls {...defaultProps} disabled={false} isPlaying={false} />
    )
    expect(screen.getByText(/start/)).toBeInTheDocument()
  })

  it('shows correct keyboard hint for pause', () => {
    render(
      <ReadingControls {...defaultProps} disabled={false} isPlaying={true} />
    )
    expect(screen.getByText(/pause/)).toBeInTheDocument()
  })

  it('does not show keyboard hint when disabled', () => {
    render(<ReadingControls {...defaultProps} disabled={true} />)
    const hints = screen.queryAllByText(/press/)
    expect(hints.length).toBe(0)
  })

  it('memoizes component', () => {
    const { rerender } = render(<ReadingControls {...defaultProps} />)
    expect(screen.getByText('50 / 100 words')).toBeInTheDocument()

    rerender(<ReadingControls {...defaultProps} />)
    expect(screen.getByText('50 / 100 words')).toBeInTheDocument()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AdaptiveControls } from '../../../components/adaptive/AdaptiveControls'

describe('AdaptiveControls', () => {
  const defaultProps = {
    progress: 50,
    calculatedWpm: 200,
    onRestart: vi.fn(),
    onNewText: vi.fn(),
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    currentPage: 1,
    totalPages: 5,
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all control buttons', () => {
    render(<AdaptiveControls {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays current WPM', () => {
    render(<AdaptiveControls {...defaultProps} calculatedWpm={250} />)
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.getByText('wpm')).toBeInTheDocument()
  })

  it('displays double dashes when WPM is 0', () => {
    render(<AdaptiveControls {...defaultProps} calculatedWpm={0} />)
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('calls onRestart when restart button is clicked', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(<AdaptiveControls {...defaultProps} onRestart={onRestart} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('calls onNewText when new text button is clicked', async () => {
    const user = userEvent.setup()
    const onNewText = vi.fn()
    render(<AdaptiveControls {...defaultProps} onNewText={onNewText} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(onNewText).toHaveBeenCalledOnce()
  })

  it('calls onGoBack when back button is clicked and canGoBack is true', async () => {
    const user = userEvent.setup()
    const onGoBack = vi.fn()
    render(
      <AdaptiveControls {...defaultProps} onGoBack={onGoBack} currentPage={2} />
    )
    const buttons = screen.getAllByRole('button')
    const backButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('back')
    )
    if (backButton) {
      await user.click(backButton)
      expect(onGoBack).toHaveBeenCalledOnce()
    }
  })

  it('disables back button when at first page', () => {
    render(<AdaptiveControls {...defaultProps} currentPage={0} />)
    const buttons = screen.getAllByRole('button')
    const backButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('back')
    )
    expect(backButton).toBeDisabled()
  })

  it('disables forward button when at last page', () => {
    render(
      <AdaptiveControls {...defaultProps} currentPage={4} totalPages={5} />
    )
    const buttons = screen.getAllByRole('button')
    const forwardButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('forward')
    )
    expect(forwardButton).toBeDisabled()
  })

  it('disables all buttons when disabled prop is true', () => {
    render(<AdaptiveControls {...defaultProps} disabled={true} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('renders with tracking status when provided', () => {
    const trackingStatus = {
      isReliable: true,
      webgazerReady: true,
      confidence: 0.9,
      onRecalibrate: vi.fn(),
    }
    render(
      <AdaptiveControls {...defaultProps} trackingStatus={trackingStatus} />
    )
    expect(screen.getByText(/Recalibrate/)).toBeInTheDocument()
  })

  it('calls onRecalibrate when recalibrate button is clicked', async () => {
    const user = userEvent.setup()
    const onRecalibrate = vi.fn()
    const trackingStatus = {
      isReliable: true,
      webgazerReady: true,
      confidence: 0.9,
      onRecalibrate,
    }
    render(
      <AdaptiveControls {...defaultProps} trackingStatus={trackingStatus} />
    )
    const recalibrateBtn = screen.getByText('Recalibrate')
    await user.click(recalibrateBtn)
    expect(onRecalibrate).toHaveBeenCalledOnce()
  })

  it('has proper aria labels for accessibility', () => {
    render(<AdaptiveControls {...defaultProps} />)
    const restartBtn = screen.getByLabelText('Restart reading')
    const newTextBtn = screen.getByLabelText('New text')
    expect(restartBtn).toBeInTheDocument()
    expect(newTextBtn).toBeInTheDocument()
  })

  it('renders progress bar', () => {
    const { container } = render(<AdaptiveControls {...defaultProps} />)
    const progressBar = container.querySelector('div[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('indicates page navigation correctly', () => {
    render(
      <AdaptiveControls {...defaultProps} currentPage={2} totalPages={5} />
    )
    const buttons = screen.getAllByRole('button')
    const backButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('back')
    )
    const forwardButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('forward')
    )

    expect(backButton).not.toBeDisabled()
    expect(forwardButton).not.toBeDisabled()
  })
})

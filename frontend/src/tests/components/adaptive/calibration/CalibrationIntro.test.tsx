import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CalibrationIntro } from '../../../../components/adaptive/calibration/CalibrationIntro'

describe('CalibrationIntro', () => {
  const defaultProps = {
    onStart: vi.fn(),
    onCancel: vi.fn(),
    webgazerStatus: 'idle' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<CalibrationIntro {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays the main title', () => {
    render(<CalibrationIntro {...defaultProps} />)
    expect(screen.getByText(/Eye Tracking Setup/)).toBeInTheDocument()
  })

  it('displays instructions', () => {
    render(<CalibrationIntro {...defaultProps} />)
    expect(
      screen.getByText(/A series of dots will appear on screen/)
    ).toBeInTheDocument()
  })

  it('displays tips', () => {
    render(<CalibrationIntro {...defaultProps} />)
    expect(screen.getByText(/Tips:/)).toBeInTheDocument()
  })

  it('calls onStart when start button is clicked', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<CalibrationIntro {...defaultProps} onStart={onStart} />)

    const startBtn = screen.getByRole('button', {
      name: /Start Calibration|Enable Camera/,
    })
    await user.click(startBtn)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CalibrationIntro {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /Cancel/ })
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('displays "Enable Camera" button when webgazer is not ready', () => {
    render(<CalibrationIntro {...defaultProps} webgazerStatus="initializing" />)
    const btn = screen.getByRole('button', { name: /Enable Camera/ })
    expect(btn).toBeInTheDocument()
  })

  it('displays "Start Calibration" button when webgazer is ready', () => {
    render(<CalibrationIntro {...defaultProps} webgazerStatus="ready" />)
    const btn = screen.getByRole('button', { name: /Start Calibration/ })
    expect(btn).toBeInTheDocument()
  })

  it('has proper heading hierarchy', () => {
    render(<CalibrationIntro {...defaultProps} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/Eye Tracking Setup/)
  })

  it('displays calibration requirements', () => {
    render(<CalibrationIntro {...defaultProps} />)
    expect(screen.getByText(/Look before clicking/)).toBeInTheDocument()
  })
})

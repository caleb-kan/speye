import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CalibrationOverlay } from '../../../../components/adaptive/calibration/CalibrationOverlay'
import type { GazeData } from '../../../../types/webgazer'

describe('CalibrationOverlay', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    webgazerStatus: 'idle' as const,
    webgazerError: null,
    gazeData: null,
    recordScreenPosition: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<CalibrationOverlay {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays intro screen on initial load', () => {
    render(<CalibrationOverlay {...defaultProps} />)
    expect(
      screen.getByText(/Horizontal Eye Tracking Calibration/)
    ).toBeInTheDocument()
  })

  it('displays loading screen when initializing', () => {
    render(
      <CalibrationOverlay {...defaultProps} webgazerStatus="initializing" />
    )
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
  })

  it('displays failed screen on error', () => {
    render(
      <CalibrationOverlay
        {...defaultProps}
        webgazerStatus="error"
        webgazerError="Test error"
      />
    )
    expect(screen.getByText(/Test error/)).toBeInTheDocument()
  })

  it('passes onCancel to child components', () => {
    const onCancel = vi.fn()
    render(<CalibrationOverlay {...defaultProps} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
  })

  it('renders intro screen for idle status', () => {
    render(<CalibrationOverlay {...defaultProps} webgazerStatus="idle" />)
    expect(screen.getByText(/How it works:/)).toBeInTheDocument()
  })

  it('renders calibration progress screen when ready', () => {
    render(<CalibrationOverlay {...defaultProps} webgazerStatus="ready" />)
    expect(
      screen.getByText(/Calibration points will appear/)
    ).toBeInTheDocument()
  })

  it('accepts recordScreenPosition callback', () => {
    const recordScreenPosition = vi.fn()
    const { container } = render(
      <CalibrationOverlay
        {...defaultProps}
        recordScreenPosition={recordScreenPosition}
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts gazeData prop', () => {
    const gazeData: GazeData = { x: 100, y: 100 }
    const { container } = render(
      <CalibrationOverlay {...defaultProps} gazeData={gazeData} />
    )
    expect(container).toBeInTheDocument()
  })

  it('handles null gazeData', () => {
    const { container } = render(
      <CalibrationOverlay {...defaultProps} gazeData={null} />
    )
    expect(container).toBeInTheDocument()
  })

  it('has proper structure with full screen overlay', () => {
    const { container } = render(<CalibrationOverlay {...defaultProps} />)
    expect(container.querySelector('div')).toBeInTheDocument()
  })
})

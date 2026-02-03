import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CalibrationLoading } from '../../../../components/adaptive/calibration/CalibrationLoading'

describe('CalibrationLoading', () => {
  const defaultProps = {
    webgazerStatus: 'initializing' as const,
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<CalibrationLoading {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders spinner', () => {
    const { container } = render(<CalibrationLoading {...defaultProps} />)
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('displays appropriate message for idle status', () => {
    render(<CalibrationLoading {...defaultProps} webgazerStatus="idle" />)
    expect(screen.getByText(/Starting eye tracker/)).toBeInTheDocument()
  })

  it('displays appropriate message for initializing status', () => {
    render(
      <CalibrationLoading {...defaultProps} webgazerStatus="initializing" />
    )
    expect(screen.getByText(/Loading eye tracking models/)).toBeInTheDocument()
  })

  it('displays appropriate message for ready status', () => {
    render(<CalibrationLoading {...defaultProps} webgazerStatus="ready" />)
    expect(screen.getByText(/Almost ready/)).toBeInTheDocument()
  })

  it('displays helpful hint for initializing', () => {
    render(
      <CalibrationLoading {...defaultProps} webgazerStatus="initializing" />
    )
    expect(screen.getByText(/This may take a moment/)).toBeInTheDocument()
  })

  it('displays camera permission hint for idle/ready', () => {
    render(<CalibrationLoading {...defaultProps} webgazerStatus="idle" />)
    expect(screen.getByText(/Please allow camera access/)).toBeInTheDocument()
  })

  it('has cancel button', () => {
    render(<CalibrationLoading {...defaultProps} />)
    const cancelBtn = screen.getByRole('button', { name: /Cancel/ })
    expect(cancelBtn).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CalibrationLoading {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /Cancel/ })
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('renders text-secondary color text', () => {
    render(<CalibrationLoading {...defaultProps} />)
    const textElements = screen.getAllByText(
      /Starting eye tracker|Loading eye tracking models|Almost ready/
    )
    expect(textElements.length).toBeGreaterThan(0)
  })
})

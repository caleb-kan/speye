import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CalibrationFailed } from '../../../../components/adaptive/calibration/CalibrationFailed'

describe('CalibrationFailed', () => {
  const defaultProps = {
    webgazerStatus: 'error' as const,
    webgazerError: null,
    onRetry: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<CalibrationFailed {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays alert icon', () => {
    const { container } = render(<CalibrationFailed {...defaultProps} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('displays error title for error status', () => {
    render(<CalibrationFailed {...defaultProps} webgazerStatus="error" />)
    expect(screen.getByText(/Eye Tracking Error/)).toBeInTheDocument()
  })

  it('displays camera denied title for permission-denied status', () => {
    render(
      <CalibrationFailed {...defaultProps} webgazerStatus="permission-denied" />
    )
    expect(screen.getByText(/Camera Access Denied/)).toBeInTheDocument()
  })

  it('displays browser not supported title for not-supported status', () => {
    render(
      <CalibrationFailed {...defaultProps} webgazerStatus="not-supported" />
    )
    expect(screen.getByText(/Browser Not Supported/)).toBeInTheDocument()
  })

  it('displays custom error message when provided', () => {
    const errorMsg = 'Custom error message'
    render(<CalibrationFailed {...defaultProps} webgazerError={errorMsg} />)
    expect(screen.getByText(errorMsg)).toBeInTheDocument()
  })

  it('displays default error message when none provided', () => {
    render(
      <CalibrationFailed
        {...defaultProps}
        webgazerStatus="error"
        webgazerError={null}
      />
    )
    expect(screen.getByText(/An error occurred/)).toBeInTheDocument()
  })

  it('has cancel button', () => {
    render(<CalibrationFailed {...defaultProps} />)
    const cancelBtn = screen.getByRole('button', { name: /Use Standard Mode/ })
    expect(cancelBtn).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CalibrationFailed {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /Use Standard Mode/ })
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows retry button for permission-denied', () => {
    render(
      <CalibrationFailed {...defaultProps} webgazerStatus="permission-denied" />
    )
    const retryBtn = screen.getByRole('button', { name: /Try Again/ })
    expect(retryBtn).toBeInTheDocument()
  })

  it('shows retry button for error status', () => {
    render(<CalibrationFailed {...defaultProps} webgazerStatus="error" />)
    const retryBtn = screen.getByRole('button', { name: /Try Again/ })
    expect(retryBtn).toBeInTheDocument()
  })

  it('does not show retry button for not-supported', () => {
    render(
      <CalibrationFailed {...defaultProps} webgazerStatus="not-supported" />
    )
    const retryBtns = screen.queryAllByRole('button', { name: /Try Again/ })
    expect(retryBtns.length).toBe(0)
  })

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <CalibrationFailed
        {...defaultProps}
        webgazerStatus="error"
        onRetry={onRetry}
      />
    )

    const retryBtn = screen.getByRole('button', { name: /Try Again/ })
    await user.click(retryBtn)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('displays browser requirements for not-supported', () => {
    render(
      <CalibrationFailed {...defaultProps} webgazerStatus="not-supported" />
    )
    expect(screen.getByText(/Try Chrome, Firefox, or Edge/)).toBeInTheDocument()
  })
})

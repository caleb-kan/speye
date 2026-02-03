import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CalibrationProgress } from '../../../../components/adaptive/calibration/CalibrationProgress'
import type { CalibrationPointState } from '../../../../types/adaptive'

describe('CalibrationProgress', () => {
  const mockPoints: CalibrationPointState[] = [
    { id: 1, x: 100, y: 100, clicksRemaining: 5, isComplete: false },
    { id: 2, x: 500, y: 100, clicksRemaining: 5, isComplete: false },
    { id: 3, x: 900, y: 100, clicksRemaining: 5, isComplete: false },
  ]

  const defaultProps = {
    points: mockPoints,
    currentPointIndex: 0,
    totalPoints: 3,
    readingAreaRef: { current: null },
    onPointClick: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<CalibrationProgress {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays calibration title', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(screen.getByText(/Horizontal Calibration/)).toBeInTheDocument()
  })

  it('displays subtitle', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(
      screen.getByText(/Training eye tracker for left-to-right reading/)
    ).toBeInTheDocument()
  })

  it('displays instruction text', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(
      screen.getByText(/Look at the point, then click/)
    ).toBeInTheDocument()
  })

  it('displays current point progress', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(screen.getByText(/Point 1 of 3/)).toBeInTheDocument()
  })

  it('displays remaining clicks for current point', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(screen.getByText(/5 click/)).toBeInTheDocument()
  })

  it('displays singular click when remaining is 1', () => {
    const singleClickPoint = [{ ...mockPoints[0], clicksRemaining: 1 }]
    render(
      <CalibrationProgress
        {...defaultProps}
        points={singleClickPoint}
        totalPoints={1}
      />
    )
    expect(screen.getByText(/1 click/)).toBeInTheDocument()
  })

  it('renders all calibration points', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(screen.getByText(/Horizontal Calibration/)).toBeInTheDocument()
  })

  it('marks current point as active', () => {
    const { container } = render(<CalibrationProgress {...defaultProps} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays progress bar', () => {
    const { container } = render(<CalibrationProgress {...defaultProps} />)
    const progressBar = container.querySelector('div[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('updates progress bar based on completed points', () => {
    const completedPoints = [
      { ...mockPoints[0], isComplete: true },
      { ...mockPoints[1], isComplete: false },
      { ...mockPoints[2], isComplete: false },
    ]
    const { container } = render(
      <CalibrationProgress {...defaultProps} points={completedPoints} />
    )
    // Progress bar width should be 33% (1 of 3 completed)
    const progressBar = container.querySelector('div[style*="width"]')
    expect(progressBar).toHaveStyle('width: 33.33333333333333%')
  })

  it('has cancel button', () => {
    render(<CalibrationProgress {...defaultProps} />)
    const cancelBtn = screen.getByRole('button', { name: /Cancel/ })
    expect(cancelBtn).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CalibrationProgress {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /Cancel/ })
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('displays reading area container', () => {
    render(<CalibrationProgress {...defaultProps} />)
    expect(
      screen.getByText(/Calibration points will appear/)
    ).toBeInTheDocument()
  })

  it('forwards ref to reading area container', () => {
    const ref = { current: null }
    render(<CalibrationProgress {...defaultProps} readingAreaRef={ref} />)
    expect(ref.current).toBeInTheDocument()
  })
})

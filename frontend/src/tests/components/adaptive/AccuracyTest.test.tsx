import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AccuracyTest } from '../../../components/adaptive/AccuracyTest'
import '@testing-library/jest-dom'
import type { GazeData } from '../../../types/webgazer'
import {
  ACCURACY_COUNTDOWN_SECONDS,
  ACCURACY_MAX_WAIT_MS,
  RESULT_DISPLAY_DELAY_MS,
} from '../../../constants/calibration'

describe('AccuracyTest', () => {
  const mockGazeData: GazeData = {
    x: 100,
    y: 100,
  }

  const defaultProps = {
    onComplete: vi.fn(),
    gazeData: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  it('cancels a delayed failure when the accuracy test is closed', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const view = render(
      <AccuracyTest gazeData={null} onComplete={onComplete} />
    )
    act(() => vi.advanceTimersByTime(ACCURACY_COUNTDOWN_SECONDS * 1000))
    act(() => vi.advanceTimersByTime(ACCURACY_MAX_WAIT_MS))
    expect(screen.getByText('Insufficient Tracking Data')).toBeInTheDocument()
    view.unmount()
    act(() => vi.advanceTimersByTime(RESULT_DISPLAY_DELAY_MS))
    expect(onComplete).not.toHaveBeenCalled()

    render(<AccuracyTest gazeData={null} onComplete={onComplete} />)
    act(() => vi.advanceTimersByTime(ACCURACY_COUNTDOWN_SECONDS * 1000))
    act(() => vi.advanceTimersByTime(ACCURACY_MAX_WAIT_MS))
    act(() => vi.advanceTimersByTime(RESULT_DISPLAY_DELAY_MS))
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(0, false)
  })

  it('renders without crashing', () => {
    const { container } = render(<AccuracyTest {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders waiting state initially', () => {
    render(<AccuracyTest {...defaultProps} />)
    expect(screen.getByText(/\d+/)).toBeInTheDocument()
  })

  it('accepts onComplete callback', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <AccuracyTest {...defaultProps} onComplete={onComplete} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts gazeData prop', () => {
    const { container } = render(
      <AccuracyTest {...defaultProps} gazeData={mockGazeData} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts target position prop', () => {
    const targetPosition = { x: 200, y: 300 }
    const { container } = render(
      <AccuracyTest {...defaultProps} targetPosition={targetPosition} />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with default target position when not provided', () => {
    const { container } = render(<AccuracyTest {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays countdown number', () => {
    render(<AccuracyTest {...defaultProps} />)
    const countdown = screen.getByText(/\d+/)
    expect(countdown).toBeInTheDocument()
  })
})

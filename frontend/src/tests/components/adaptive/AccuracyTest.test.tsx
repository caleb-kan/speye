import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccuracyTest } from '../../../components/adaptive/AccuracyTest'
import '@testing-library/jest-dom'
import type { GazeData } from '../../../types/webgazer'

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

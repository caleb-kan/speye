import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AdaptiveReader } from '../../../components/adaptive/AdaptiveReader'

vi.mock('../../../hooks/useWebGazer', () => ({
  useWebGazer: () => ({
    status: 'ready',
    isReady: true,
    error: null,
    recordScreenPosition: vi.fn(),
    clearData: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useGazeSmoothing', () => ({
  useGazeSmoothing: () => ({
    smoothedGaze: { x: 100, y: 100 },
    confidence: 0.9,
    isReliable: true,
    addSample: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useHorizontalReader', () => ({
  useHorizontalReader: () => ({
    currentChunk: 0,
    horizontalProgress: 0,
    isInEndZone: false,
    isSweepDetected: false,
    isComplete: false,
    progress: 0,
    calculatedWpm: 200,
    restart: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useCalibration', () => ({
  useCalibration: () => ({
    state: { isCalibrated: true },
    completeCalibration: vi.fn(),
    failCalibration: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useCalibrationDriftDetection', () => ({
  useCalibrationDriftDetection: () => ({
    shouldRecalibrate: false,
    dismissSuggestion: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('AdaptiveReader', () => {
  const defaultProps = {
    title: 'Test Article',
    text: 'The quick brown fox jumps over the lazy dog',
    source: 'Test Source',
    onNewText: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<AdaptiveReader {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders the reader title', () => {
    render(<AdaptiveReader {...defaultProps} />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('accepts onNewText callback', () => {
    const onNewText = vi.fn()
    const { container } = render(
      <AdaptiveReader {...defaultProps} onNewText={onNewText} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts onComplete callback', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <AdaptiveReader {...defaultProps} onComplete={onComplete} />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with null title', () => {
    const { container } = render(
      <AdaptiveReader {...defaultProps} title={null} />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with null source', () => {
    const { container } = render(
      <AdaptiveReader {...defaultProps} source={null} />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders control buttons', () => {
    render(<AdaptiveReader {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

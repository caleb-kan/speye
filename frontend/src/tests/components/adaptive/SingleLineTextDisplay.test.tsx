import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SingleLineTextDisplay } from '../../../components/adaptive/SingleLineTextDisplay'

describe('SingleLineTextDisplay', () => {
  const defaultProps = {
    text: 'The quick brown fox jumps over the lazy dog',
    currentChunk: 0,
    horizontalProgress: 0,
    isTrackingReliable: true,
    isInEndZone: false,
    isSweepDetected: false,
    onContainerMeasured: vi.fn(),
    onTotalChunksCalculated: vi.fn(),
    onChunkWordCounts: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<SingleLineTextDisplay {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('accepts onTotalChunksCalculated callback', () => {
    const onTotalChunksCalculated = vi.fn()
    const { container } = render(
      <SingleLineTextDisplay
        {...defaultProps}
        onTotalChunksCalculated={onTotalChunksCalculated}
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts onChunkWordCounts callback', () => {
    const onChunkWordCounts = vi.fn()
    const { container } = render(
      <SingleLineTextDisplay
        {...defaultProps}
        onChunkWordCounts={onChunkWordCounts}
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts onContainerMeasured callback', () => {
    const onContainerMeasured = vi.fn()
    const { container } = render(
      <SingleLineTextDisplay
        {...defaultProps}
        onContainerMeasured={onContainerMeasured}
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts tracking reliability prop', () => {
    const { container, rerender } = render(
      <SingleLineTextDisplay {...defaultProps} isTrackingReliable={true} />
    )
    expect(container).toBeInTheDocument()

    rerender(
      <SingleLineTextDisplay {...defaultProps} isTrackingReliable={false} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts chunk changes', () => {
    const { container, rerender } = render(
      <SingleLineTextDisplay {...defaultProps} currentChunk={0} />
    )
    expect(container).toBeInTheDocument()

    rerender(<SingleLineTextDisplay {...defaultProps} currentChunk={1} />)
    expect(container).toBeInTheDocument()
  })

  it('accepts isInEndZone prop', () => {
    const { container } = render(
      <SingleLineTextDisplay {...defaultProps} isInEndZone={true} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts isSweepDetected prop', () => {
    const { container } = render(
      <SingleLineTextDisplay {...defaultProps} isSweepDetected={true} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts horizontalProgress prop', () => {
    const { container, rerender } = render(
      <SingleLineTextDisplay {...defaultProps} horizontalProgress={0} />
    )
    expect(container).toBeInTheDocument()

    rerender(
      <SingleLineTextDisplay {...defaultProps} horizontalProgress={50} />
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts different text', () => {
    const { container, rerender } = render(
      <SingleLineTextDisplay {...defaultProps} text="Short text" />
    )
    expect(container).toBeInTheDocument()

    rerender(
      <SingleLineTextDisplay
        {...defaultProps}
        text="Longer text with more words to display"
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with unreliable tracking', () => {
    const { container } = render(
      <SingleLineTextDisplay {...defaultProps} isTrackingReliable={false} />
    )
    expect(container).toBeInTheDocument()
  })
})

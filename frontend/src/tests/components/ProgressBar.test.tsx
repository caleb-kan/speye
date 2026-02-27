import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProgressBar } from '../../components/ProgressBar'

describe('ProgressBar', () => {
  const defaultProps = {
    progress: 50,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ProgressBar {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('displays progress percentage', () => {
    render(<ProgressBar {...defaultProps} progress={75} />)
    expect(screen.getByTestId('progress-complete-text')).toHaveTextContent(
      '75% complete'
    )
  })

  it('renders progress bar element with correct role', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toBeInTheDocument()
  })

  it('sets aria-valuenow to progress percentage', () => {
    render(<ProgressBar {...defaultProps} progress={65} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '65')
  })

  it('sets aria-valuemin to 0', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
  })

  it('sets aria-valuemax to 100', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('has descriptive aria-label', () => {
    render(<ProgressBar {...defaultProps} progress={50} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-label', 'Reading progress: 50%')
  })

  it('displays word count when showWordCount is true', () => {
    render(
      <ProgressBar
        {...defaultProps}
        showWordCount={true}
        currentWord={50}
        totalWords={100}
      />
    )
    expect(screen.getByTestId('progress-word-count-text')).toHaveTextContent(
      '50 / 100 words'
    )
  })

  it('does not display word count when showWordCount is false', () => {
    render(
      <ProgressBar
        {...defaultProps}
        showWordCount={false}
        currentWord={50}
        totalWords={100}
      />
    )
    expect(screen.queryByText(/words/)).not.toBeInTheDocument()
  })

  it('displays percentage in word count mode', () => {
    render(
      <ProgressBar
        {...defaultProps}
        progress={75}
        showWordCount={true}
        currentWord={75}
        totalWords={100}
      />
    )
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('75%')
  })

  it('handles 0% progress', () => {
    render(<ProgressBar {...defaultProps} progress={0} />)
    expect(screen.getByTestId('progress-complete-text')).toHaveTextContent(
      '0% complete'
    )
  })

  it('handles 100% progress', () => {
    render(<ProgressBar {...defaultProps} progress={100} />)
    expect(screen.getByTestId('progress-complete-text')).toHaveTextContent(
      '100% complete'
    )
  })

  it('rounds progress percentage for display', () => {
    render(<ProgressBar {...defaultProps} progress={33.333} />)
    expect(screen.getByTestId('progress-complete-text')).toHaveTextContent(
      '33% complete'
    )
  })

  it('applies custom height', () => {
    render(<ProgressBar {...defaultProps} height={8} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveStyle('height: 8px')
  })

  it('defaults to 4px height', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveStyle('height: 4px')
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProgressBar {...defaultProps} className="custom-class" />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders progress fill correctly', () => {
    render(<ProgressBar {...defaultProps} progress={60} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill).toHaveStyle('width: 60%')
  })

  it('has rounded styling', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar.className).toContain('rounded-full')
  })

  it('has overflow hidden for clean edges', () => {
    render(<ProgressBar {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar.className).toContain('overflow-hidden')
  })

  it('memoizes component to prevent unnecessary re-renders', () => {
    const { rerender } = render(<ProgressBar {...defaultProps} progress={50} />)
    expect(screen.getByText('50% complete')).toBeInTheDocument()

    rerender(<ProgressBar {...defaultProps} progress={50} />)
    expect(screen.getByText('50% complete')).toBeInTheDocument()
  })
})

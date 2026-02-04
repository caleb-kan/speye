import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StartQuizButton } from '../../components/StartQuizButton'

describe('StartQuizButton', () => {
  const defaultProps = {
    textId: 'text-1',
    readingComplete: false,
    wpm: 200, // Added required prop
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<StartQuizButton {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('renders button with "Start Quiz" label', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button', { name: /Start Quiz/ })
    expect(btn).toBeInTheDocument()
  })

  it('hides wrapper when reading is not complete', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={false} />)
    const btn = screen.getByRole('button')
    // The opacity class is now on the parent wrapper div
    const wrapper = btn.parentElement
    expect(wrapper?.className).toContain('opacity-0')
    expect(wrapper?.className).toContain('translate-y-4')
  })

  it('shows wrapper when reading is complete', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    const wrapper = btn.parentElement
    expect(wrapper?.className).toContain('opacity-100')
    expect(wrapper?.className).toContain('scale-100')
  })

  // Style checks for the button itself (bg, rounded, etc.)
  it('button has primary background color', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary')
  })

  it('button has rounded styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('rounded')
  })

  it('button has shadow styling', () => {
    render(<StartQuizButton {...defaultProps} readingComplete={true} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('shadow')
  })

  it('accepts different textIds', () => {
    const { rerender } = render(
      <StartQuizButton {...defaultProps} textId="text-1" />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<StartQuizButton {...defaultProps} textId="text-2" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('updates wrapper classes when readingComplete changes', () => {
    const { rerender } = render(
      <StartQuizButton {...defaultProps} readingComplete={false} />
    )
    let btn = screen.getByRole('button')
    let wrapper = btn.parentElement
    expect(wrapper?.className).toContain('opacity-0')

    rerender(<StartQuizButton {...defaultProps} readingComplete={true} />)
    btn = screen.getByRole('button')
    wrapper = btn.parentElement
    expect(wrapper?.className).toContain('opacity-100')
  })
})

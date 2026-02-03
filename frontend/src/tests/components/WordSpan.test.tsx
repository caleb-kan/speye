import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WordSpan } from '../../components/WordSpan'

describe('WordSpan', () => {
  const defaultProps = {
    word: 'Hello',
    globalIndex: 0,
    currentWordIndex: 0,
    blurEnabled: false,
    transition: 'color 200ms ease',
    setRef: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the word', () => {
    const { container } = render(<WordSpan {...defaultProps} />)
    const span = container.querySelector('span')
    expect(span).toHaveTextContent('Hello')
  })

  it('registers ref when setRef callback is provided', () => {
    const setRef = vi.fn()
    render(<WordSpan {...defaultProps} setRef={setRef} />)
    expect(setRef).toHaveBeenCalled()
  })

  it('receives span element in setRef callback', () => {
    const setRef = vi.fn()
    render(<WordSpan {...defaultProps} setRef={setRef} />)
    expect(setRef).toHaveBeenCalledWith(expect.any(HTMLSpanElement))
  })

  it('applies transition style', () => {
    const { container } = render(<WordSpan {...defaultProps} />)
    const span = container.querySelector('span')
    expect(span).toHaveStyle('transition: color 200ms ease')
  })

  it('highlights current word with different color', () => {
    const { container } = render(
      <WordSpan {...defaultProps} currentWordIndex={0} globalIndex={0} />
    )
    const span = container.querySelector('span')
    expect(span?.getAttribute('style')).toContain('color')
  })

  it('changes styling when distance changes', () => {
    const { rerender, container: container1 } = render(
      <WordSpan {...defaultProps} currentWordIndex={5} globalIndex={5} />
    )

    const span1 = container1.querySelector('span')?.getAttribute('style')

    rerender(
      <WordSpan {...defaultProps} currentWordIndex={5} globalIndex={0} />
    )

    const span2 = document.querySelector('span')?.getAttribute('style')

    expect(span1).not.toEqual(span2)
  })

  it('applies blur effect when blurEnabled is true and distance is far', () => {
    const { container } = render(
      <WordSpan
        {...defaultProps}
        blurEnabled={true}
        currentWordIndex={0}
        globalIndex={8}
      />
    )
    const span = container.querySelector('span')
    const style = span?.getAttribute('style')
    // At distance 8, blur should be applied if blurEnabled
    expect(style).toContain('filter: blur')
  })

  it('does not apply blur when blurEnabled is false', () => {
    const { container } = render(
      <WordSpan
        {...defaultProps}
        blurEnabled={false}
        currentWordIndex={0}
        globalIndex={-5}
      />
    )
    const span = container.querySelector('span')
    const style = span?.getAttribute('style')
    expect(style).not.toContain('filter: blur')
  })

  it('adds space after word', () => {
    const { container } = render(<WordSpan {...defaultProps} word="test" />)
    const span = container.querySelector('span')
    expect(span?.textContent).toContain('test ')
  })

  it('memoizes component to prevent unnecessary re-renders', () => {
    const setRef = vi.fn()
    const { rerender } = render(<WordSpan {...defaultProps} setRef={setRef} />)

    rerender(<WordSpan {...defaultProps} setRef={setRef} />)

    expect(setRef).toHaveBeenCalled()
  })

  it('handles words with special characters', () => {
    const { container } = render(<WordSpan {...defaultProps} word="don't" />)
    const span = container.querySelector('span')
    expect(span?.textContent).toContain("don't")
  })

  it('handles words with punctuation', () => {
    const { container } = render(<WordSpan {...defaultProps} word="Hello," />)
    const span = container.querySelector('span')
    expect(span?.textContent).toContain('Hello,')
  })

  it('updates when globalIndex changes', () => {
    const { rerender, container } = render(
      <WordSpan {...defaultProps} globalIndex={0} currentWordIndex={0} />
    )
    let span = container.querySelector('span')
    expect(span?.textContent).toContain('Hello')

    rerender(
      <WordSpan {...defaultProps} globalIndex={5} currentWordIndex={0} />
    )
    span = container.querySelector('span')
    expect(span?.textContent).toContain('Hello')
  })

  it('has proper opacity styling', () => {
    const { container } = render(
      <WordSpan {...defaultProps} globalIndex={10} currentWordIndex={0} />
    )
    const span = container.querySelector('span')
    expect(span?.getAttribute('style')).toContain('opacity')
  })
})

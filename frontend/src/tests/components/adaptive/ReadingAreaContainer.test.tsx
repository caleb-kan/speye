import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ReadingAreaContainer } from '../../../components/adaptive/ReadingAreaContainer'

describe('ReadingAreaContainer', () => {
  it('renders children correctly', () => {
    render(
      <ReadingAreaContainer>
        <div>Test content</div>
      </ReadingAreaContainer>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('accepts reading variant', () => {
    const { container } = render(
      <ReadingAreaContainer variant="reading">
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const inner = container.querySelector('div')
    expect(inner).toBeInTheDocument()
  })

  it('accepts calibration variant', () => {
    const { container } = render(
      <ReadingAreaContainer variant="calibration">
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const readingArea = container.querySelector('div[class*="border-dashed"]')
    expect(readingArea).toBeInTheDocument()
  })

  it('accepts custom container className', () => {
    const { container } = render(
      <ReadingAreaContainer containerClassName="custom-class">
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const readingArea = container.querySelector('.custom-class')
    expect(readingArea).toBeInTheDocument()
  })

  it('accepts custom container style', () => {
    const customStyle = { padding: '20px' }
    const { container } = render(
      <ReadingAreaContainer containerStyle={customStyle}>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const readingArea = container.querySelector('div[style*="padding"]')
    expect(readingArea).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(
      <ReadingAreaContainer ref={ref}>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('renders with max-width constraint', () => {
    const { container } = render(
      <ReadingAreaContainer>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const wrapper = container.querySelector('div[class*="max-w"]')
    expect(wrapper).toBeInTheDocument()
  })

  it('centers content', () => {
    const { container } = render(
      <ReadingAreaContainer>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const centeringDiv = container.querySelector('div[class*="justify-center"]')
    expect(centeringDiv).toBeInTheDocument()
  })

  it('applies reading container classes', () => {
    const { container } = render(
      <ReadingAreaContainer>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const readingArea = container.querySelector('div[class*="relative"]')
    expect(readingArea).toBeInTheDocument()
  })

  it('default variant is reading', () => {
    const { container } = render(
      <ReadingAreaContainer>
        <div>Content</div>
      </ReadingAreaContainer>
    )
    const calibrationBorder = container.querySelector(
      'div[class*="border-dashed"]'
    )
    expect(calibrationBorder).not.toBeInTheDocument()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TextTitle } from '../../components/TextTitle'

describe('TextTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title without source', () => {
    render(<TextTitle title="Test Article" />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('renders title with source as link', () => {
    render(<TextTitle title="Test Article" source="https://example.com" />)
    const link = screen.getByRole('link', { name: /Test Article/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('opens link in new tab when source is provided', () => {
    render(<TextTitle title="Test Article" source="https://example.com" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays external link icon when source is provided', () => {
    const { container } = render(
      <TextTitle title="Test Article" source="https://example.com" />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('does not display external link icon when source is not provided', () => {
    const { container } = render(<TextTitle title="Test Article" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeInTheDocument()
  })

  it('applies link styling when source is provided', () => {
    render(<TextTitle title="Test Article" source="https://example.com" />)
    const link = screen.getByRole('link')
    expect(link.className).toContain('text-primary')
    expect(link.className).toContain('underline')
  })

  it('applies heading styling', () => {
    render(<TextTitle title="Test Article" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2.className).toContain('text-2xl')
    expect(h2.className).toContain('font-semibold')
    expect(h2.className).toContain('text-center')
  })

  it('handles null source gracefully', () => {
    render(<TextTitle title="Test Article" source={null} />)
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('renders plain span when no source', () => {
    const { container } = render(
      <TextTitle title="Test Article" source={null} />
    )
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span?.textContent).toBe('Test Article')
  })

  it('applies text color to non-link title', () => {
    const { container } = render(<TextTitle title="Test Article" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('text-text')
  })

  it('centers the title', () => {
    render(<TextTitle title="Test Article" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2.className).toContain('text-center')
  })

  it('has proper heading semantics', () => {
    render(<TextTitle title="Test Article" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2.tagName).toBe('H2')
  })

  it('handles long titles', () => {
    const longTitle =
      'A Very Long Title That Might Wrap To Multiple Lines In The Display'
    render(<TextTitle title={longTitle} />)
    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('preserves special characters in title', () => {
    const specialTitle = 'Title with (Special) & Characters!'
    render(<TextTitle title={specialTitle} />)
    expect(screen.getByText(specialTitle)).toBeInTheDocument()
  })
})

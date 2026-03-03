import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavTooltip } from '../../components/navbar/NavTooltip'
import '@testing-library/jest-dom'

describe('NavTooltip', () => {
  it('renders the label text', () => {
    render(<NavTooltip label="Home" isMobile={false} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('is hidden from screen readers via aria-hidden', () => {
    render(<NavTooltip label="Home" isMobile={false} />)
    const tooltip = screen.getByText('Home')
    expect(tooltip).toHaveAttribute('aria-hidden', 'true')
  })

  it('has pointer-events-none to avoid blocking clicks', () => {
    render(<NavTooltip label="Home" isMobile={false} />)
    const tooltip = screen.getByText('Home')
    expect(tooltip.className).toContain('pointer-events-none')
  })

  it('starts hidden with opacity-0', () => {
    render(<NavTooltip label="Home" isMobile={false} />)
    const tooltip = screen.getByText('Home')
    expect(tooltip.className).toContain('opacity-0')
  })

  it('applies desktop positioning classes when not mobile', () => {
    render(<NavTooltip label="Settings" isMobile={false} />)
    const tooltip = screen.getByText('Settings')
    expect(tooltip.className).toContain('left-full')
    expect(tooltip.className).toContain('-translate-y-1/2')
    expect(tooltip.className).toContain('ml-3')
  })

  it('applies mobile positioning classes when mobile', () => {
    render(<NavTooltip label="Settings" isMobile={true} />)
    const tooltip = screen.getByText('Settings')
    expect(tooltip.className).toContain('top-full')
    expect(tooltip.className).toContain('-translate-x-1/2')
    expect(tooltip.className).toContain('mt-2')
  })

  it('does not apply mobile classes on desktop', () => {
    render(<NavTooltip label="Home" isMobile={false} />)
    const tooltip = screen.getByText('Home')
    expect(tooltip.className).not.toContain('top-full')
    expect(tooltip.className).not.toContain('mt-2')
  })

  it('does not apply desktop classes on mobile', () => {
    render(<NavTooltip label="Home" isMobile={true} />)
    const tooltip = screen.getByText('Home')
    expect(tooltip.className).not.toContain('left-full')
    expect(tooltip.className).not.toContain('ml-3')
  })
})

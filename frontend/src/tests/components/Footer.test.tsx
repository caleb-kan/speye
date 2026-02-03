import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { Footer } from '../../components/Footer'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<Footer />)
    expect(container).toBeInTheDocument()
  })

  it('displays copyright text', () => {
    renderWithRouter(<Footer />)
    expect(screen.getByText(/© 2026 sp\(eye\)/)).toBeInTheDocument()
  })

  it('displays rights reserved text', () => {
    renderWithRouter(<Footer />)
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  it('renders Terms of Service link', () => {
    renderWithRouter(<Footer />)
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' })
    expect(termsLink).toBeInTheDocument()
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('renders Privacy Policy link', () => {
    renderWithRouter(<Footer />)
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('has footer element', () => {
    const { container } = renderWithRouter(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer).toBeInTheDocument()
  })

  it('has fixed positioning at bottom-left', () => {
    const { container } = renderWithRouter(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer?.className).toContain('fixed')
    expect(footer?.className).toContain('bottom-2')
    expect(footer?.className).toContain('left-2')
  })

  it('has text-secondary color', () => {
    const { container } = renderWithRouter(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer?.className).toContain('text-text-secondary')
  })

  it('has small text size', () => {
    const { container } = renderWithRouter(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer?.className).toContain('text-xs')
  })

  it('has high z-index for visibility', () => {
    const { container } = renderWithRouter(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer?.className).toContain('z-40')
  })

  it('renders separator between links', () => {
    renderWithRouter(<Footer />)
    const text = screen.getByText(/·/)
    expect(text).toBeInTheDocument()
  })

  it('links have hover underline effect', () => {
    renderWithRouter(<Footer />)
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' })
    expect(termsLink.className).toContain('hover:underline')
  })

  it('links have correct text size', () => {
    renderWithRouter(<Footer />)
    const termsLink = screen.getByRole('link', { name: 'Terms of Service' })
    expect(termsLink.className).toContain('text-xs')
  })
})

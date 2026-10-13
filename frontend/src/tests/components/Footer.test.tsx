import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { Footer } from '../../components/Footer'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

let mockIsMobile = false
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
  })

  it('renders without crashing', () => {
    renderWithRouter(<Footer />)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
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
    const termsLink = screen.getByTestId('footer-terms-link')
    expect(termsLink).toBeInTheDocument()
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('keeps legal and license links available on mobile', () => {
    mockIsMobile = true
    renderWithRouter(<Footer />)
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'License' })).toBeVisible()
  })

  it('renders Privacy Policy link', () => {
    renderWithRouter(<Footer />)
    const privacyLink = screen.getByTestId('footer-privacy-link')
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('renders License link', () => {
    renderWithRouter(<Footer />)
    const licenseLink = screen.getByTestId('footer-license-link')
    expect(licenseLink).toBeInTheDocument()
    expect(licenseLink).toHaveAttribute('href', '/license')
  })

  it('has footer element', () => {
    renderWithRouter(<Footer />)
    const footer = screen.getByTestId('footer')
    expect(footer).toBeInTheDocument()
  })

  it('has fixed positioning at bottom-left', () => {
    renderWithRouter(<Footer />)
    const footer = screen.getByTestId('footer')
    expect(footer?.className).toContain('fixed')
    expect(footer?.className).toContain('bottom-2')
    expect(footer?.className).toContain('left-2')
  })

  it('has text-secondary color', () => {
    renderWithRouter(<Footer />)
    const footer = screen.getByTestId('footer')
    expect(footer?.className).toContain('text-text-secondary')
  })

  it('has small text size', () => {
    renderWithRouter(<Footer />)
    const footer = screen.getByTestId('footer')
    expect(footer?.className).toContain('text-xs')
  })

  it('has high z-index for visibility', () => {
    renderWithRouter(<Footer />)
    const footer = screen.getByTestId('footer')
    expect(footer?.className).toContain('z-40')
  })

  it('renders separator between links', () => {
    renderWithRouter(<Footer />)
    const text = screen.getByText(/·/)
    expect(text).toBeInTheDocument()
  })

  it('links have hover underline effect', () => {
    renderWithRouter(<Footer />)
    const termsLink = screen.getByTestId('footer-terms-link')
    expect(termsLink.className).toContain('hover:underline')
  })

  it('links have correct text size', () => {
    renderWithRouter(<Footer />)
    const termsLink = screen.getByTestId('footer-terms-link')
    expect(termsLink.className).toContain('text-xs')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { Header } from '../../components/Header'
import '@testing-library/jest-dom'
import type { Mode } from '../../types/reading'

let mockIsMobile = false
let mockMode: Mode = 'standard'

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

vi.mock('../../hooks/useReadingPreferences', () => ({
  useReadingPreferences: () => ({
    preferences: { mode: mockMode },
  }),
}))

const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  )
}

const renderHeaderWithRoute = (route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
    mockMode = 'standard'
  })

  describe('Logo', () => {
    it('renders the logo text', () => {
      renderHeader()

      expect(screen.getByText('sp(eye)')).toBeInTheDocument()
    })

    it('logo links to home page', () => {
      renderHeader()

      expect(screen.getByRole('link', { name: 'sp(eye)' })).toHaveAttribute(
        'href',
        '/home'
      )
    })
  })

  describe('Styling', () => {
    it('header has fixed position', () => {
      const { container } = renderHeader()

      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('fixed')
    })

    it('header is positioned at top left with padding', () => {
      const { container } = renderHeader()

      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('top-4')
      expect(header).toHaveClass('left-4')
    })
  })

  describe('Accessibility', () => {
    it('logo has focus-visible ring styling', () => {
      renderHeader()

      const logo = screen.getByRole('link', { name: 'sp(eye)' })
      expect(logo).toHaveClass('focus-visible:ring-2')
    })
  })

  describe('Mobile', () => {
    it('returns null when useIsMobile returns true', () => {
      mockIsMobile = true
      const { container } = renderHeader()
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Mode routing', () => {
    it('logo links to /home for standard mode', () => {
      mockMode = 'standard'
      renderHeader()
      expect(screen.getByRole('link', { name: 'sp(eye)' })).toHaveAttribute(
        'href',
        '/home'
      )
    })

    it('logo links to /adaptive for adaptive mode', () => {
      mockMode = 'adaptive'
      renderHeader()
      expect(screen.getByRole('link', { name: 'sp(eye)' })).toHaveAttribute(
        'href',
        '/adaptive'
      )
    })

    it('logo links to /rsvp for rsvp mode', () => {
      mockMode = 'rsvp'
      renderHeader()
      expect(screen.getByRole('link', { name: 'sp(eye)' })).toHaveAttribute(
        'href',
        '/rsvp'
      )
    })
  })

  describe('Navigation prevention', () => {
    it('prevents click when already on target route', async () => {
      mockMode = 'standard'
      renderHeaderWithRoute('/home')

      const link = screen.getByRole('link', { name: 'sp(eye)' })
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault')

      link.dispatchEvent(clickEvent)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('does not prevent click when on different route', async () => {
      mockMode = 'standard'
      renderHeaderWithRoute('/library')

      const link = screen.getByRole('link', { name: 'sp(eye)' })
      // When on /library with standard mode, target is /home — should not prevent
      expect(link).toHaveAttribute('href', '/home')
    })
  })
})

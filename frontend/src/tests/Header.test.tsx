import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Header } from '../components/Header'
import '@testing-library/jest-dom'

const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  )
}

describe('Header', () => {
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
})

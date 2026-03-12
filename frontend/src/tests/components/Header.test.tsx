import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Header } from '../../components/Header'
import '@testing-library/jest-dom'

let mockIsMobile = false

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: { id: 'midnight', name: 'Midnight', colors: {} },
    themes: [],
    setTheme: vi.fn(),
    loading: false,
  }),
}))

const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
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

  describe('Mobile', () => {
    it('returns null when useIsMobile returns true', () => {
      mockIsMobile = true
      const { container } = renderHeader()
      expect(container.firstChild).toBeNull()
    })
  })
})

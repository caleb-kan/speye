import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RsvpDisplay } from '../../components/rsvp/RsvpDisplay'

let mockIsMobile = false

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

describe('RsvpDisplay', () => {
  const defaultProps = {
    title: null,
    source: null,
    phrases: [
      'phrase one',
      'phrase two',
      'phrase three',
      'phrase four',
      'phrase five',
    ],
    currentPhraseIndex: 2,
    visibleLines: 3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
  })

  describe('rendering phrases', () => {
    it('renders correct number of visible lines', () => {
      const { container } = render(<RsvpDisplay {...defaultProps} />)
      const phraseContainer = container.querySelector(
        '.flex-1.flex.flex-col'
      ) as HTMLElement
      // visibleLines=3 should produce 3 child elements
      expect(phraseContainer.children).toHaveLength(3)
    })

    it('current phrase has text-3xl and text-primary classes', () => {
      render(<RsvpDisplay {...defaultProps} />)
      const currentPhrase = screen.getByText('phrase three')
      expect(currentPhrase).toHaveClass('text-3xl')
      expect(currentPhrase).toHaveClass('text-primary')
    })

    it('non-current phrases have text-xl and text-text-secondary classes', () => {
      render(<RsvpDisplay {...defaultProps} />)
      const prevPhrase = screen.getByText('phrase two')
      expect(prevPhrase).toHaveClass('text-xl')
      expect(prevPhrase).toHaveClass('text-text-secondary')
    })

    it('out-of-bounds indices render empty divs with aria-hidden="true"', () => {
      const { container } = render(
        <RsvpDisplay
          {...defaultProps}
          currentPhraseIndex={0}
          visibleLines={3}
        />
      )
      // With currentPhraseIndex=0 and visibleLines=3, half=1
      // offset -1 → phraseIndex -1 → out of bounds → empty div
      const emptyDivs = container.querySelectorAll('[aria-hidden="true"]')
      expect(emptyDivs.length).toBeGreaterThanOrEqual(1)
    })

    it('applies decreasing opacity with distance from center', () => {
      const { container } = render(
        <RsvpDisplay
          {...defaultProps}
          currentPhraseIndex={2}
          visibleLines={5}
        />
      )
      // Distance 1 from center: opacity = max(0.1, 0.5 - (1-1)*0.1) = 0.5
      const phraseContainer = container.querySelector(
        '.flex-1.flex.flex-col'
      ) as HTMLElement
      const children = Array.from(phraseContainer.children) as HTMLElement[]
      // Non-current phrases should have inline opacity style
      const nonCurrentWithStyle = children.filter(
        (el) => el.style.opacity !== '' && el.style.opacity !== undefined
      )
      expect(nonCurrentWithStyle.length).toBeGreaterThan(0)
    })

    it('visibleLines=1 shows only current phrase', () => {
      render(
        <RsvpDisplay
          {...defaultProps}
          visibleLines={1}
          currentPhraseIndex={2}
        />
      )
      expect(screen.getByText('phrase three')).toBeInTheDocument()
      expect(screen.queryByText('phrase two')).not.toBeInTheDocument()
      expect(screen.queryByText('phrase four')).not.toBeInTheDocument()
    })
  })

  describe('title', () => {
    it('renders title via TextTitle when provided', () => {
      render(<RsvpDisplay {...defaultProps} title="My Title" />)
      expect(screen.getByText('My Title')).toBeInTheDocument()
    })

    it('does not render title section when title is null', () => {
      const { container } = render(
        <RsvpDisplay {...defaultProps} title={null} />
      )
      // No h2 element should be present (TextTitle renders an h2)
      expect(container.querySelector('h2')).not.toBeInTheDocument()
    })
  })

  describe('children', () => {
    it('renders children in bottom container', () => {
      render(
        <RsvpDisplay {...defaultProps}>
          <button>Play</button>
        </RsvpDisplay>
      )
      expect(screen.getByText('Play')).toBeInTheDocument()
    })
  })

  describe('mobile layout', () => {
    it('uses flex-1 w-full classes on mobile', () => {
      mockIsMobile = true
      const { container } = render(<RsvpDisplay {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex-1')
      expect(wrapper).toHaveClass('w-full')
    })
  })

  describe('desktop layout', () => {
    it('uses rounded-3xl card styling on desktop', () => {
      mockIsMobile = false
      const { container } = render(<RsvpDisplay {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('rounded-3xl')
      expect(wrapper).toHaveClass('border')
    })

    it('has aspect ratio style on desktop', () => {
      mockIsMobile = false
      const { container } = render(<RsvpDisplay {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.aspectRatio).toBe('3 / 5')
    })

    it('does not have aspect ratio style on mobile', () => {
      mockIsMobile = true
      const { container } = render(<RsvpDisplay {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.aspectRatio).toBe('')
    })
  })
})

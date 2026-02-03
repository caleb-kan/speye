import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { GazeStatusIndicator } from '../../../components/adaptive/GazeStatusIndicator'

describe('GazeStatusIndicator', () => {
  const defaultProps = {
    isReliable: true,
    webgazerReady: true,
    confidence: 0.85,
    isInEndZone: false,
    isSweepDetected: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('minimal variant', () => {
    it('renders sweep detected status with priority', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isSweepDetected={true}
          isInEndZone={true}
          isReliable={true}
        />
      )
      expect(screen.getByText(/Advancing/)).toBeInTheDocument()
      expect(screen.queryByText(/End zone/)).not.toBeInTheDocument()
    })

    it('renders end zone status', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isInEndZone={true}
          isReliable={true}
        />
      )
      expect(screen.getByText(/End zone/)).toBeInTheDocument()
    })

    it('renders tracking status when reliable', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isReliable={true}
        />
      )
      expect(screen.getByText(/Tracking/)).toBeInTheDocument()
    })

    it('renders not tracking status when unreliable', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isReliable={false}
        />
      )
      expect(screen.getByText(/Not tracking/)).toBeInTheDocument()
    })

    it('shows colored dot indicators', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isReliable={true}
        />
      )
      const text = screen.getByText(/Tracking/)
      expect(text.textContent).toContain('●')
    })

    it('prioritizes sweep over end zone', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isSweepDetected={true}
          isInEndZone={true}
        />
      )
      expect(screen.getByText(/Advancing/)).toBeInTheDocument()
    })

    it('prioritizes end zone over tracking status', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isInEndZone={true}
          isReliable={true}
        />
      )
      expect(screen.getByText(/End zone/)).toBeInTheDocument()
      expect(screen.queryByText(/Tracking/)).not.toBeInTheDocument()
    })
  })

  describe('detailed variant', () => {
    it('displays confidence percentage when reliable', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={true}
          confidence={0.92}
        />
      )
      expect(screen.getByText(/92%/)).toBeInTheDocument()
    })

    it('displays low confidence text when unreliable', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={false}
        />
      )
      expect(screen.getByText(/Low confidence/)).toBeInTheDocument()
    })

    it('renders eye icon when reliable', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={true}
        />
      )
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders alert/warning icon when unreliable', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={false}
          webgazerReady={false}
        />
      )
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('has tooltip explaining good tracking quality', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={true}
        />
      )
      const div = container.querySelector('div[title]')
      expect(div?.getAttribute('title')).toContain('good')
    })

    it('has tooltip explaining poor tracking quality', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={false}
        />
      )
      const div = container.querySelector('div[title]')
      expect(div?.getAttribute('title')).toContain('low')
    })

    it('formats confidence as percentage', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={0.567}
        />
      )
      expect(screen.getByText(/57%/)).toBeInTheDocument()
    })

    it('handles 0% confidence', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={0}
        />
      )
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('handles 100% confidence', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={1}
        />
      )
      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })

    it('applies correct icon color for reliable tracking', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={true}
        />
      )
      const svg = container.querySelector('svg')
      expect(svg?.className.baseVal).toContain('text-success')
    })

    it('applies correct icon color for unreliable tracking', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={false}
          webgazerReady={true}
        />
      )
      const svg = container.querySelector('svg')
      expect(svg?.className.baseVal).toContain('text-warning')
    })

    it('applies error color when webgazer not ready', () => {
      const { container } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          isReliable={false}
          webgazerReady={false}
        />
      )
      const svg = container.querySelector('svg')
      expect(svg?.className.baseVal).toContain('text-error')
    })
  })

  describe('default behavior', () => {
    it('defaults to detailed variant', () => {
      render(<GazeStatusIndicator {...defaultProps} />)
      expect(screen.getByText(/85%/)).toBeInTheDocument()
    })

    it('defaults webgazerReady to true', () => {
      render(<GazeStatusIndicator isReliable={true} confidence={0.8} />)
      expect(screen.getByText(/80%/)).toBeInTheDocument()
    })

    it('defaults confidence to 0', () => {
      render(<GazeStatusIndicator isReliable={true} />)
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('defaults end zone flags to false', () => {
      render(<GazeStatusIndicator {...defaultProps} variant="minimal" />)
      expect(screen.getByText(/Tracking/)).toBeInTheDocument()
      expect(screen.queryByText(/End zone/)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has semantic structure for detailed variant', () => {
      const { container } = render(
        <GazeStatusIndicator {...defaultProps} variant="detailed" />
      )
      const div = container.querySelector('div')
      expect(div).toBeInTheDocument()
    })

    it('has accessible text labels', () => {
      render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={0.75}
        />
      )
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })

    it('has title attribute for tooltip access', () => {
      const { container } = render(
        <GazeStatusIndicator {...defaultProps} variant="detailed" />
      )
      const div = container.querySelector('div[title]')
      expect(div).toHaveAttribute('title')
    })
  })

  describe('state transitions', () => {
    it('updates when reliability changes', () => {
      const { rerender } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isReliable={true}
        />
      )
      expect(screen.getByText(/Tracking/)).toBeInTheDocument()

      rerender(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isReliable={false}
        />
      )
      expect(screen.getByText(/Not tracking/)).toBeInTheDocument()
    })

    it('updates when sweep is detected', () => {
      const { rerender } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isSweepDetected={false}
        />
      )
      expect(screen.getByText(/Tracking/)).toBeInTheDocument()

      rerender(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isSweepDetected={true}
        />
      )
      expect(screen.getByText(/Advancing/)).toBeInTheDocument()
    })

    it('updates when entering end zone', () => {
      const { rerender } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isInEndZone={false}
        />
      )
      expect(screen.getByText(/Tracking/)).toBeInTheDocument()

      rerender(
        <GazeStatusIndicator
          {...defaultProps}
          variant="minimal"
          isInEndZone={true}
        />
      )
      expect(screen.getByText(/End zone/)).toBeInTheDocument()
    })

    it('updates confidence display', () => {
      const { rerender } = render(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={0.5}
        />
      )
      expect(screen.getByText(/50%/)).toBeInTheDocument()

      rerender(
        <GazeStatusIndicator
          {...defaultProps}
          variant="detailed"
          confidence={0.95}
        />
      )
      expect(screen.getByText(/95%/)).toBeInTheDocument()
    })
  })

  describe('responsive text', () => {
    it('shows text-secondary color for status text', () => {
      const { container } = render(
        <GazeStatusIndicator {...defaultProps} variant="detailed" />
      )
      const span = container.querySelector('span')
      expect(span?.className).toContain('text-text-secondary')
    })

    it('renders as flex container', () => {
      const { container } = render(
        <GazeStatusIndicator {...defaultProps} variant="detailed" />
      )
      const div = container.querySelector('div')
      expect(div?.className).toContain('flex')
    })
  })
})

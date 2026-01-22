import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Resizable } from '../components/Resizable'
import {
  MIN_WIDTH_PERCENT,
  MAX_WIDTH_PERCENT,
  DEFAULT_WIDTH_PERCENT,
} from '../constants/resize'
import '@testing-library/jest-dom'

// Mock getBoundingClientRect for consistent testing
const mockGetBoundingClientRect = vi.fn(() => ({
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}))

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.getBoundingClientRect = mockGetBoundingClientRect
})

const defaultProps = {
  widthPercent: DEFAULT_WIDTH_PERCENT,
  onWidthChange: vi.fn(),
}

const renderResizable = (props = {}) => {
  return render(
    <div style={{ width: '1000px' }}>
      <Resizable {...defaultProps} {...props}>
        <div data-testid="content">Test Content</div>
      </Resizable>
    </div>
  )
}

describe('Resizable', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderResizable()

      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders resize handle', () => {
      renderResizable()

      expect(screen.getByRole('separator')).toBeInTheDocument()
    })

    it('applies default width as percentage', () => {
      const { container } = renderResizable()

      const resizableContainer = container.querySelector('.flex')
      const expectedWidth = `${Math.round(DEFAULT_WIDTH_PERCENT * 100)}%`
      expect(resizableContainer).toHaveStyle({ width: expectedWidth })
    })

    it('applies custom width', () => {
      const { container } = renderResizable({ widthPercent: 0.7 })

      const resizableContainer = container.querySelector('.flex')
      expect(resizableContainer).toHaveStyle({ width: '70%' })
    })
  })

  describe('Accessibility', () => {
    it('has correct role attribute', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('role', 'separator')
    })

    it('has aria-orientation set to vertical', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    })

    it('has aria-label for screen readers', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-label', 'Resize text width')
    })

    it('has aria-valuemin based on minWidthPercent', () => {
      renderResizable({ minWidthPercent: 0.3 })

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuemin', '30')
    })

    it('has aria-valuemax based on maxWidthPercent', () => {
      renderResizable({ maxWidthPercent: 0.9 })

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuemax', '90')
    })

    it('has default aria-valuemin matching MIN_WIDTH_PERCENT', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      const expectedMin = String(Math.round(MIN_WIDTH_PERCENT * 100))
      expect(separator).toHaveAttribute('aria-valuemin', expectedMin)
    })

    it('has default aria-valuemax matching MAX_WIDTH_PERCENT', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      const expectedMax = String(Math.round(MAX_WIDTH_PERCENT * 100))
      expect(separator).toHaveAttribute('aria-valuemax', expectedMax)
    })

    it('has aria-valuenow attribute', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuenow')
    })

    it('has aria-valuetext for human-readable value', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuetext')
      expect(separator.getAttribute('aria-valuetext')).toMatch(/\d+% width/)
    })

    it('is focusable via tabIndex', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('tabIndex', '0')
    })

    it('has focus ring styles', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('focus:ring-2')
      expect(separator).toHaveClass('focus:outline-none')
    })
  })

  describe('Keyboard Navigation', () => {
    it('responds to ArrowRight key press', async () => {
      const user = userEvent.setup()
      const onWidthChange = vi.fn()
      renderResizable({ onWidthChange })

      const separator = screen.getByRole('separator')
      separator.focus()

      await user.keyboard('{ArrowRight}')

      expect(onWidthChange).toHaveBeenCalled()
    })

    it('responds to ArrowLeft key press', async () => {
      const user = userEvent.setup()
      const onWidthChange = vi.fn()
      renderResizable({ onWidthChange })

      const separator = screen.getByRole('separator')
      separator.focus()

      await user.keyboard('{ArrowLeft}')

      expect(onWidthChange).toHaveBeenCalled()
    })

    it('ignores non-arrow keys', async () => {
      const user = userEvent.setup()
      renderResizable()

      const separator = screen.getByRole('separator')
      separator.focus()

      await user.keyboard('{Enter}')
      await user.keyboard('{Space}')
      await user.keyboard('a')

      expect(separator).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('has cursor-col-resize class', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('cursor-col-resize')
    })

    it('has touch-none class for proper touch handling', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('touch-none')
    })

    it('has opacity transition for hover effect', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('transition-opacity')
    })

    it('has hover state styling', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('hover:opacity-40')
    })

    it('has active state styling', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('active:opacity-40')
    })

    it('uses primary color for background', () => {
      renderResizable()

      const separator = screen.getByRole('separator')
      expect(separator).toHaveClass('bg-primary')
    })
  })

  describe('Props', () => {
    it('accepts minWidthPercent prop', () => {
      renderResizable({ minWidthPercent: 0.2 })

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuemin', '20')
    })

    it('accepts maxWidthPercent prop', () => {
      renderResizable({ maxWidthPercent: 0.95 })

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('aria-valuemax', '95')
    })

    it('accepts widthPercent prop', () => {
      const { container } = renderResizable({ widthPercent: 0.5 })

      const resizableContainer = container.querySelector('.flex')
      expect(resizableContainer).toHaveStyle({ width: '50%' })
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WindowSizeProvider } from '../../components/WindowSizeProvider'
import {
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  MODAL_BACKDROP_BLUR,
  WINDOW_SIZE_WARNING_MESSAGE,
} from '../../constants/ui'
import '@testing-library/jest-dom'

// Mock window.innerWidth and window.innerHeight
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default to a large window size
  mockWindowSize(1920, 1080)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const renderWindowSizeProvider = (
  initialWidth = 1920,
  initialHeight = 1080
) => {
  mockWindowSize(initialWidth, initialHeight)
  return render(
    <WindowSizeProvider>
      <div data-testid="content">Test Content</div>
    </WindowSizeProvider>
  )
}

describe('WindowSizeProvider', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderWindowSizeProvider()

      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('does not show warning when window size is large enough', () => {
      renderWindowSizeProvider(1920, 1080)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      expect(
        screen.queryByText(WINDOW_SIZE_WARNING_MESSAGE)
      ).not.toBeInTheDocument()
    })

    it('shows warning when window width is below minimum', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
      expect(screen.getByText(WINDOW_SIZE_WARNING_MESSAGE)).toBeInTheDocument()
    })

    it('shows warning when window height is below minimum', () => {
      renderWindowSizeProvider(1920, MIN_WINDOW_HEIGHT - 1)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
      expect(screen.getByText(WINDOW_SIZE_WARNING_MESSAGE)).toBeInTheDocument()
    })

    it('shows warning when both width and height are below minimum', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, MIN_WINDOW_HEIGHT - 1)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
      expect(screen.getByText(WINDOW_SIZE_WARNING_MESSAGE)).toBeInTheDocument()
    })

    it('applies blur effect to children when warning is shown', () => {
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const childrenContainer = container.firstChild as HTMLElement
      expect(childrenContainer).toBeInTheDocument()
      expect(childrenContainer).toHaveStyle({
        filter: `blur(${MODAL_BACKDROP_BLUR}px)`,
      })
      expect(childrenContainer).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not apply blur effect when warning is not shown', () => {
      const { container } = renderWindowSizeProvider(1920, 1080)

      const childrenContainer = container.firstChild as HTMLElement
      expect(childrenContainer).toBeInTheDocument()
      // When filter is undefined, React doesn't set the style attribute, so it won't have the filter style
      expect(childrenContainer.style.filter).toBeFalsy()
      expect(childrenContainer).toHaveAttribute('aria-hidden', 'false')
    })
  })

  describe('Warning Modal Styling', () => {
    it('has correct positioning classes', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const modal = screen.getByText('Please note:').parentElement
      expect(modal).toHaveClass('fixed')
      expect(modal).toHaveClass('top-1/2')
      expect(modal).toHaveClass('left-1/2')
      expect(modal).toHaveClass('transform')
      expect(modal).toHaveClass('-translate-x-1/2')
      expect(modal).toHaveClass('-translate-y-1/2')
    })

    it('has correct styling classes', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const modal = screen.getByText('Please note:').parentElement
      expect(modal).toHaveClass('bg-bg-secondary')
      expect(modal).toHaveClass('border')
      expect(modal).toHaveClass('rounded-lg')
      expect(modal).toHaveClass('shadow-lg')
      expect(modal).toHaveClass('z-50')
    })

    it('displays error styling for warning text', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const warningText = screen.getByText('Please note:')
      expect(warningText).toHaveClass('text-error')
    })

    it('renders close button with correct styling', () => {
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const closeButton = container.querySelector('.close-button')
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveClass('close-button')
      expect(closeButton).toHaveClass('cursor-pointer')
      expect(closeButton).toHaveClass('absolute')
      expect(closeButton).toHaveClass('top-2')
      expect(closeButton).toHaveClass('right-2')
    })
  })

  describe('Window Resize Events', () => {
    it('registers resize event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      renderWindowSizeProvider(1920, 1080)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )
    })

    it('registers orientationchange event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      renderWindowSizeProvider(1920, 1080)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      )
    })

    it('adapts to different initial window sizes - large width', () => {
      const { unmount } = renderWindowSizeProvider(1920, 1080)
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      unmount()
    })

    it('adapts to different initial window sizes - small width', () => {
      const { unmount } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)
      expect(screen.getByText('Please note:')).toBeInTheDocument()
      unmount()
    })

    it('adapts to different initial window sizes - small height', () => {
      const { unmount } = renderWindowSizeProvider(1920, MIN_WINDOW_HEIGHT - 1)
      expect(screen.getByText('Please note:')).toBeInTheDocument()
      unmount()
    })

    it('shows warning when window is resized from large to small', async () => {
      renderWindowSizeProvider(1920, 1080)

      // Initially no warning
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()

      // Resize to small window
      mockWindowSize(MIN_WINDOW_WIDTH - 1, 1080)
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Warning should now appear
      await waitFor(() => {
        expect(screen.getByText('Please note:')).toBeInTheDocument()
      })
    })

    it('hides warning when window is resized from small to large', async () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      // Initially warning is shown
      expect(screen.getByText('Please note:')).toBeInTheDocument()

      // Resize to large window
      mockWindowSize(1920, 1080)
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Warning should disappear
      await waitFor(() => {
        expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      })
    })

    it('responds to height changes during resize', async () => {
      renderWindowSizeProvider(1920, 1080)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()

      // Resize to have insufficient height
      mockWindowSize(1920, MIN_WINDOW_HEIGHT - 1)
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(screen.getByText('Please note:')).toBeInTheDocument()
      })
    })
  })

  describe('Orientation Change Events', () => {
    it('responds to orientation change with correct initial state - portrait mode', () => {
      const { unmount } = renderWindowSizeProvider(600, 1000)
      expect(screen.getByText('Please note:')).toBeInTheDocument()
      unmount()
    })

    it('responds to orientation change with correct initial state - landscape mode', () => {
      const { unmount } = renderWindowSizeProvider(1920, 1080)
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      unmount()
    })

    it('shows warning when device rotates from landscape to portrait', async () => {
      renderWindowSizeProvider(1920, 1080)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()

      // Simulate rotation to portrait with small width
      mockWindowSize(600, 1000)
      act(() => {
        window.dispatchEvent(new Event('orientationchange'))
      })

      await waitFor(() => {
        expect(screen.getByText('Please note:')).toBeInTheDocument()
      })
    })

    it('hides warning when device rotates from portrait to landscape', async () => {
      renderWindowSizeProvider(600, 1000)

      expect(screen.getByText('Please note:')).toBeInTheDocument()

      // Simulate rotation to landscape with large width
      mockWindowSize(1920, 1080)
      act(() => {
        window.dispatchEvent(new Event('orientationchange'))
      })

      await waitFor(() => {
        expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('closes warning when X button is clicked', async () => {
      const user = userEvent.setup()
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()

      const closeButton = screen.getByRole('button', {
        name: /close window size warning/i,
      })
      expect(closeButton).toBeInTheDocument()
      await user.click(closeButton)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('closes warning when Escape key is pressed', async () => {
      const user = userEvent.setup()
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('closes warning when overlay is clicked', async () => {
      const user = userEvent.setup()
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()

      // Get the overlay element (fixed inset-0 element)
      const overlay = container.querySelector('.fixed.inset-0')
      expect(overlay).toBeInTheDocument()

      await user.click(overlay!)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('does not close warning when modal content is clicked', async () => {
      const user = userEvent.setup()
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const modal = screen.getByRole('dialog')
      await user.click(modal)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
    })

    it('keeps warning closed after user manually closes it', async () => {
      const user = userEvent.setup()
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()

      // Warning should stay closed (user dismissed it)
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('does not respond to Escape key when warning is not shown', async () => {
      const user = userEvent.setup()
      renderWindowSizeProvider(1920, 1080)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })
  })

  describe('Event Listener Cleanup', () => {
    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderWindowSizeProvider()

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )
    })

    it('removes orientationchange event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderWindowSizeProvider()

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      )
    })

    it('removes keydown event listener when warning is closed', async () => {
      const user = userEvent.setup()
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const closeButton = screen.getByRole('button', {
        name: /close window size warning/i,
      })
      await user.click(closeButton)

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })

    it('removes keydown event listener on unmount when warning is shown', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles window size exactly at minimum width', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH, 1080)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('handles window size exactly at minimum height', () => {
      renderWindowSizeProvider(1920, MIN_WINDOW_HEIGHT)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })

    it('handles window size one pixel below minimum width', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
    })

    it('handles window size one pixel below minimum height', () => {
      renderWindowSizeProvider(1920, MIN_WINDOW_HEIGHT - 1)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
    })

    it('handles very small window sizes', () => {
      renderWindowSizeProvider(300, 200)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
    })

    it('handles very large window sizes', () => {
      renderWindowSizeProvider(3840, 2160)

      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('warning modal is in the DOM and visible', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const modal = screen.getByRole('dialog')
      expect(modal).toBeVisible()
    })

    it('modal has proper ARIA attributes', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute(
        'aria-labelledby',
        'window-size-warning-title'
      )
      expect(modal).toHaveAttribute(
        'aria-describedby',
        'window-size-warning-description'
      )
    })

    it('modal title and description have proper IDs', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const title = document.getElementById('window-size-warning-title')
      const description = document.getElementById(
        'window-size-warning-description'
      )

      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Please note:')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent(WINDOW_SIZE_WARNING_MESSAGE)
    })

    it('close button is accessible with proper aria-label', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const closeButton = screen.getByRole('button', {
        name: /close window size warning/i,
      })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveClass('cursor-pointer')
    })

    it('background content is marked as hidden when modal is shown', () => {
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const childrenContainer = container.firstChild as HTMLElement
      expect(childrenContainer).toHaveAttribute('aria-hidden', 'true')
    })

    it('background content is non-interactive when modal is shown', () => {
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const childrenContainer = container.firstChild as HTMLElement
      expect(childrenContainer).toHaveStyle({ pointerEvents: 'none' })
    })

    it('background content is interactive when modal is not shown', () => {
      const { container } = renderWindowSizeProvider(1920, 1080)

      const childrenContainer = container.firstChild as HTMLElement
      expect(childrenContainer).toHaveStyle({ pointerEvents: 'auto' })
    })

    it('warning text has proper semantic structure', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByText('Please note:')).toBeInTheDocument()
      expect(screen.getByText(WINDOW_SIZE_WARNING_MESSAGE)).toBeInTheDocument()
    })

    it('children remain accessible when warning is shown', () => {
      renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  describe('Constants Integration', () => {
    it('uses MIN_WINDOW_WIDTH constant correctly', () => {
      const { unmount: unmount1 } = renderWindowSizeProvider(
        MIN_WINDOW_WIDTH - 1,
        1080
      )
      expect(screen.getByText('Please note:')).toBeInTheDocument()
      unmount1()

      const { unmount: unmount2 } = renderWindowSizeProvider(
        MIN_WINDOW_WIDTH,
        1080
      )
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      unmount2()
    })

    it('uses MIN_WINDOW_HEIGHT constant correctly', () => {
      const { unmount: unmount1 } = renderWindowSizeProvider(
        1920,
        MIN_WINDOW_HEIGHT - 1
      )
      expect(screen.getByText('Please note:')).toBeInTheDocument()
      unmount1()

      const { unmount: unmount2 } = renderWindowSizeProvider(
        1920,
        MIN_WINDOW_HEIGHT
      )
      expect(screen.queryByText('Please note:')).not.toBeInTheDocument()
      unmount2()
    })

    it('uses WINDOW_BACKDROP_BLUR constant for blur effect', () => {
      const { container } = renderWindowSizeProvider(MIN_WINDOW_WIDTH - 1, 1080)

      const blurredContainer = container.firstChild as HTMLElement
      expect(blurredContainer).toBeInTheDocument()
      expect(blurredContainer).toHaveStyle({
        filter: `blur(${MODAL_BACKDROP_BLUR}px)`,
      })
    })
  })
})

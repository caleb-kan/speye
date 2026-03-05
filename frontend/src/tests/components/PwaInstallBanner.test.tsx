import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PwaInstallBanner } from '../../components/ui/PwaInstallBanner'

describe('PwaInstallBanner', () => {
  const onDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderBanner() {
    return render(<PwaInstallBanner onDismiss={onDismiss} />)
  }

  it('renders the banner with install message', () => {
    renderBanner()
    expect(screen.getByTestId('pwa-install-banner')).toBeDefined()
    expect(
      screen.getByText('Install this app for a better experience')
    ).toBeDefined()
  })

  it('does not show the instruction popup initially', () => {
    renderBanner()
    expect(screen.queryByTestId('pwa-install-popup')).toBeNull()
  })

  it('toggles the instruction popup on banner click', () => {
    renderBanner()
    const toggle = screen.getByRole('button', { expanded: false })
    fireEvent.click(toggle)

    expect(screen.getByTestId('pwa-install-popup')).toBeDefined()
    expect(screen.getByText('How to install sp(eye) as a PWA')).toBeDefined()

    fireEvent.click(toggle)
    expect(screen.queryByTestId('pwa-install-popup')).toBeNull()
  })

  it('closes the popup via the close button inside the popup', () => {
    renderBanner()
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByTestId('pwa-install-popup')).toBeDefined()

    fireEvent.click(screen.getByLabelText('Close instructions'))
    expect(screen.queryByTestId('pwa-install-popup')).toBeNull()
  })

  it('calls onDismiss and closes popup when dismiss button is clicked', () => {
    renderBanner()
    // Open popup first
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByTestId('pwa-install-popup')).toBeDefined()

    fireEvent.click(screen.getByLabelText('Dismiss install banner'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders all three instruction steps', () => {
    renderBanner()
    fireEvent.click(screen.getByRole('button', { expanded: false }))

    expect(screen.getByText('1')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
  })

  it('sets aria-expanded correctly on the toggle button', () => {
    renderBanner()
    const toggle = screen.getByRole('button', { expanded: false })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('links aria-controls to the popup id', () => {
    renderBanner()
    const toggle = screen.getByRole('button', { expanded: false })
    expect(toggle.getAttribute('aria-controls')).toBe('pwa-install-popup')

    fireEvent.click(toggle)
    const popup = screen.getByTestId('pwa-install-popup')
    expect(popup.getAttribute('id')).toBe('pwa-install-popup')
  })
})

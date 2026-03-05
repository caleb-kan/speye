import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RootLayout } from '../../layouts/RootLayout'
import { STORAGE_KEYS } from '../../constants/storage'

// Mock child components to isolate layout logic
vi.mock('../../components/navbar/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))
vi.mock('../../components/Header', () => ({
  Header: () => <div data-testid="header" />,
}))
vi.mock('../../components/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}))
vi.mock('../../components/notifications/NotificationToaster', () => ({
  NotificationToaster: () => null,
}))
vi.mock('../../components/notifications/NotificationsMailButton', () => ({
  NotificationsMailButton: () => null,
}))
vi.mock('../../components/ui/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}))

let mockIsMobile = true
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

let mockIsMobileDevice = true
vi.mock('../../utils/isMobileDevice', () => ({
  isMobileDevice: () => mockIsMobileDevice,
}))

let mockIsPwaStandalone = false
vi.mock('../../utils/isPwaStandalone', () => ({
  isPwaStandalone: () => mockIsPwaStandalone,
}))

// Mock localStorage since jsdom may not provide full support
const localStorageStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(
      (key) => delete localStorageStore[key]
    )
  }),
  key: vi.fn(),
  length: 0,
}
vi.stubGlobal('localStorage', mockLocalStorage)

function renderLayout(initialPath = '/rsvp') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RootLayout />
    </MemoryRouter>
  )
}

describe('RootLayout PWA banner integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageStore).forEach(
      (key) => delete localStorageStore[key]
    )
    mockIsMobile = true
    mockIsMobileDevice = true
    mockIsPwaStandalone = false
  })

  it('shows the PWA banner on mobile browser', () => {
    renderLayout()
    expect(screen.getByTestId('pwa-install-banner')).toBeDefined()
  })

  it('hides the banner on desktop', () => {
    mockIsMobile = false
    mockIsMobileDevice = false
    renderLayout()
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('hides the banner when running as a PWA', () => {
    mockIsPwaStandalone = true
    renderLayout()
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('hides the banner when previously dismissed', () => {
    localStorageStore[STORAGE_KEYS.PWA_BANNER_DISMISSED] = '1'
    renderLayout()
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('persists dismissal to localStorage', () => {
    renderLayout()
    expect(screen.getByTestId('pwa-install-banner')).toBeDefined()

    fireEvent.click(screen.getByLabelText('Dismiss install banner'))

    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.PWA_BANNER_DISMISSED,
      '1'
    )
  })

  it('hides banner when useIsMobile reports desktop', () => {
    mockIsMobile = false
    renderLayout()
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('hides the banner on non-RSVP routes', () => {
    renderLayout('/home')
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('hides the banner on the library route', () => {
    renderLayout('/library')
    expect(screen.queryByTestId('pwa-install-banner')).toBeNull()
  })

  it('adds bottom padding to main when banner is visible', () => {
    renderLayout()
    const main = screen.getByRole('main')
    expect(main.className).toContain('pb-11')
  })

  it('does not add bottom padding when banner is hidden', () => {
    mockIsMobile = false
    mockIsMobileDevice = false
    renderLayout()
    const main = screen.getByRole('main')
    expect(main.className).not.toContain('pb-11')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installMockLocalStorage } from '../helpers/mockLocalStorage'

vi.mock('../../utils/isMobileDevice', () => ({
  isMobileDevice: vi.fn(),
}))

import { ROUTES, MODE_ROUTES, getDefaultReadingRoute } from '../../utils/routes'
import { isMobileDevice } from '../../utils/isMobileDevice'
import { STORAGE_KEYS } from '../../constants/storage'

const { reset: resetLocalStorage } = installMockLocalStorage()
const mockIsMobileDevice = vi.mocked(isMobileDevice)

function setStoredMode(mode: string) {
  localStorage.setItem(
    STORAGE_KEYS.READING_PREFERENCES,
    JSON.stringify({ mode })
  )
}

describe('routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLocalStorage()
  })

  describe('ROUTES constants', () => {
    it('has expected route values', () => {
      expect(ROUTES.HOME).toBe('/home')
      expect(ROUTES.ADAPTIVE).toBe('/adaptive')
      expect(ROUTES.RSVP).toBe('/rsvp')
      expect(ROUTES.LIBRARY).toBe('/library')
      expect(ROUTES.ACTIVITY).toBe('/activity')
      expect(ROUTES.ADMIN).toBe('/admin')
      expect(ROUTES.SETTINGS).toBe('/settings')
      expect(ROUTES.LOGIN).toBe('/login')
    })
  })

  describe('MODE_ROUTES', () => {
    it('maps standard mode to /home', () => {
      expect(MODE_ROUTES.standard).toBe('/home')
    })

    it('maps adaptive mode to /adaptive', () => {
      expect(MODE_ROUTES.adaptive).toBe('/adaptive')
    })

    it('maps rsvp mode to /rsvp', () => {
      expect(MODE_ROUTES.rsvp).toBe('/rsvp')
    })
  })

  describe('getDefaultReadingRoute', () => {
    it('returns /rsvp on mobile regardless of stored mode', () => {
      mockIsMobileDevice.mockReturnValue(true)
      setStoredMode('adaptive')

      expect(getDefaultReadingRoute()).toBe(ROUTES.RSVP)
    })

    it('returns the stored mode route on desktop', () => {
      mockIsMobileDevice.mockReturnValue(false)
      setStoredMode('adaptive')

      expect(getDefaultReadingRoute()).toBe(ROUTES.ADAPTIVE)
    })

    it('returns /rsvp on desktop when stored mode is rsvp', () => {
      mockIsMobileDevice.mockReturnValue(false)
      setStoredMode('rsvp')

      expect(getDefaultReadingRoute()).toBe(ROUTES.RSVP)
    })

    it('returns /home on desktop when stored mode is standard', () => {
      mockIsMobileDevice.mockReturnValue(false)
      setStoredMode('standard')

      expect(getDefaultReadingRoute()).toBe(ROUTES.HOME)
    })

    it('returns /home on desktop when nothing is stored', () => {
      mockIsMobileDevice.mockReturnValue(false)

      expect(getDefaultReadingRoute()).toBe(ROUTES.HOME)
    })

    it('returns /home on desktop when stored mode is invalid', () => {
      mockIsMobileDevice.mockReturnValue(false)
      setStoredMode('garbage')

      expect(getDefaultReadingRoute()).toBe(ROUTES.HOME)
    })
  })
})

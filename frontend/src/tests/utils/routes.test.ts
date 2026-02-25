import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/isMobileDevice', () => ({
  isMobileDevice: vi.fn(),
}))

import { ROUTES, MODE_ROUTES, getDefaultReadingRoute } from '../../utils/routes'
import { isMobileDevice } from '../../utils/isMobileDevice'

const mockIsMobileDevice = vi.mocked(isMobileDevice)

describe('routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    it('returns /rsvp when on mobile device', () => {
      mockIsMobileDevice.mockReturnValue(true)

      expect(getDefaultReadingRoute()).toBe('/rsvp')
    })

    it('returns /home when on desktop device', () => {
      mockIsMobileDevice.mockReturnValue(false)

      expect(getDefaultReadingRoute()).toBe('/home')
    })
  })
})

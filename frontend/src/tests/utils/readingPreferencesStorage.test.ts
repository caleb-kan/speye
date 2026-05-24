import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installMockLocalStorage } from '../helpers/mockLocalStorage'

vi.mock('../../utils/isMobileDevice', () => ({
  isMobileDevice: vi.fn(),
}))

import {
  DEFAULT_READING_PREFERENCES,
  loadReadingPreferences,
  loadStoredMode,
  saveReadingPreferences,
} from '../../utils/readingPreferencesStorage'
import { STORAGE_KEYS } from '../../constants/storage'
import { isMobileDevice } from '../../utils/isMobileDevice'

const { reset: resetLocalStorage } = installMockLocalStorage()
const mockIsMobileDevice = vi.mocked(isMobileDevice)

describe('readingPreferencesStorage', () => {
  beforeEach(() => {
    mockIsMobileDevice.mockReturnValue(false)
    resetLocalStorage()
  })

  describe('loadReadingPreferences', () => {
    it('returns defaults when nothing is stored', () => {
      expect(loadReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES)
    })

    it('returns stored values when valid', () => {
      const prefs = {
        ...DEFAULT_READING_PREFERENCES,
        mode: 'adaptive' as const,
        wpm: 420,
      }
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify(prefs)
      )
      expect(loadReadingPreferences()).toEqual(prefs)
    })

    it('falls back to defaults for missing fields', () => {
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify({ mode: 'rsvp' })
      )
      expect(loadReadingPreferences()).toEqual({
        ...DEFAULT_READING_PREFERENCES,
        mode: 'rsvp',
      })
    })

    it('ignores an invalid stored mode', () => {
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify({ mode: 'nonsense' })
      )
      expect(loadReadingPreferences().mode).toBe(
        DEFAULT_READING_PREFERENCES.mode
      )
    })

    it('forces rsvp on mobile regardless of stored mode', () => {
      mockIsMobileDevice.mockReturnValue(true)
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify({ mode: 'adaptive' })
      )
      expect(loadReadingPreferences().mode).toBe('rsvp')
    })

    it('returns defaults when stored JSON is malformed', () => {
      localStorage.setItem(STORAGE_KEYS.READING_PREFERENCES, '{not json')
      expect(loadReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES)
    })

    it('rejects arrays (typeof [] === "object" but spreading them corrupts shape)', () => {
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify(['adaptive', 500])
      )
      expect(loadReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES)
    })

    it('rejects null stored as JSON', () => {
      localStorage.setItem(STORAGE_KEYS.READING_PREFERENCES, 'null')
      expect(loadReadingPreferences()).toEqual(DEFAULT_READING_PREFERENCES)
    })
  })

  describe('saveReadingPreferences', () => {
    it('persists the full preferences object', () => {
      const prefs = {
        ...DEFAULT_READING_PREFERENCES,
        mode: 'adaptive' as const,
        wpm: 555,
      }
      saveReadingPreferences(prefs)
      const raw = localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES)
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!)).toEqual(prefs)
    })
  })

  describe('loadStoredMode', () => {
    it('returns null when nothing is stored', () => {
      expect(loadStoredMode()).toBeNull()
    })

    it('returns the stored mode when valid', () => {
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify({ mode: 'adaptive' })
      )
      expect(loadStoredMode()).toBe('adaptive')
    })

    it('returns null when the stored mode is not a valid Mode', () => {
      localStorage.setItem(
        STORAGE_KEYS.READING_PREFERENCES,
        JSON.stringify({ mode: 'bogus' })
      )
      expect(loadStoredMode()).toBeNull()
    })

    it('returns null when stored JSON is malformed', () => {
      localStorage.setItem(STORAGE_KEYS.READING_PREFERENCES, 'not-json')
      expect(loadStoredMode()).toBeNull()
    })
  })
})

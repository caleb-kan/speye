import type { ReadingPreferences } from '../context/readingPreferencesContext'
import type { Mode } from '../types'
import { STORAGE_KEYS } from '../constants/storage'
import { DEFAULT_MODE, MODES } from '../constants/modes'
import { DEFAULT_WPM } from '../constants/wpm'
import {
  DEFAULT_MIN_COMPLEXITY,
  DEFAULT_MAX_COMPLEXITY,
} from '../constants/complexity'
import { DEFAULT_WIDTH_PERCENT } from '../constants/resize'
import { DEFAULT_VISIBLE_LINES } from '../constants/visibleLines'
import { DEFAULT_PHRASE_SIZE } from '../constants/rsvp'
import { isMobileDevice } from './isMobileDevice'

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  wpm: DEFAULT_WPM,
  mode: DEFAULT_MODE,
  scrolling: 'dynamic',
  blurEnabled: false,
  fiction: false,
  complexityMin: DEFAULT_MIN_COMPLEXITY,
  complexityMax: DEFAULT_MAX_COMPLEXITY,
  textWidthPercent: DEFAULT_WIDTH_PERCENT,
  visibleLines: DEFAULT_VISIBLE_LINES,
  phraseSize: DEFAULT_PHRASE_SIZE,
}

function isMode(value: unknown): value is Mode {
  return (
    typeof value === 'string' && (MODES as readonly string[]).includes(value)
  )
}

function readRawPreferences(): Partial<ReadingPreferences> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Resolves the effective mode given a stored value, applying the mobile
 * constraint. Mobile devices always read in RSVP — adaptive needs eye
 * tracking which isn't supported, and standard has no useful mobile UI.
 */
function resolveMode(stored: unknown): Mode {
  if (isMobileDevice()) return 'rsvp'
  return isMode(stored) ? stored : DEFAULT_READING_PREFERENCES.mode
}

export function loadReadingPreferences(): ReadingPreferences {
  const parsed = readRawPreferences()
  if (!parsed) {
    return { ...DEFAULT_READING_PREFERENCES, mode: resolveMode(undefined) }
  }
  return {
    ...DEFAULT_READING_PREFERENCES,
    ...parsed,
    mode: resolveMode(parsed.mode),
  }
}

export function saveReadingPreferences(prefs: ReadingPreferences): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.READING_PREFERENCES,
      JSON.stringify(prefs)
    )
  } catch (e) {
    console.warn('Failed to save reading preferences:', e)
  }
}

/**
 * Lightweight read of just the persisted mode for callers that don't need
 * full preferences (e.g. non-reactive route resolution). Returns null when
 * nothing is stored or the stored mode isn't a valid Mode — callers decide
 * what to do with that. This does NOT apply the mobile constraint; combine
 * with `isMobileDevice()` at the call site if needed.
 */
export function loadStoredMode(): Mode | null {
  const parsed = readRawPreferences()
  if (!parsed) return null
  return isMode(parsed.mode) ? parsed.mode : null
}

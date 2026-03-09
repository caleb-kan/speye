import { STORAGE_KEYS } from '../constants/storage'
import type { Mode } from '../types/reading'

export type ReadingActivitySession = {
  textId: string
  startTime: string | null
  started: boolean
  wpm: number | null
  mode: Mode | null
  progressIndex: number | null
}

const defaultSession: ReadingActivitySession = {
  textId: '',
  startTime: null,
  started: false,
  wpm: null,
  mode: null,
  progressIndex: null,
}

export function loadReadingActivitySession(): ReadingActivitySession | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
    if (!stored) return null
    const parsed = JSON.parse(stored) as ReadingActivitySession
    if (!parsed?.textId) return null
    return { ...defaultSession, ...parsed }
  } catch {
    return null
  }
}

function saveReadingActivitySession(session: ReadingActivitySession): boolean {
  try {
    sessionStorage.setItem(
      STORAGE_KEYS.READING_ACTIVITY_SESSION,
      JSON.stringify(session)
    )
    return true
  } catch {
    return false
  }
}

export function upsertReadingActivitySession(
  partial: Partial<ReadingActivitySession>
): ReadingActivitySession | null {
  const existing = loadReadingActivitySession()
  const next: ReadingActivitySession = {
    ...defaultSession,
    ...existing,
    ...partial,
  }

  if (!next.textId) return null
  saveReadingActivitySession(next)
  return next
}

export function clearReadingActivitySession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
  } catch {
    // ignore storage errors
  }
}

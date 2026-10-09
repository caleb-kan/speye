import { STORAGE_KEYS } from '../constants/storage'
import type { Mode } from '../types/reading'

export type ReadingActivitySession = {
  activityId: string | null
  readingSessionId: string | null
  completed: boolean
  userId: string | null
  textId: string
  startTime: string | null
  started: boolean
  wpm: number | null
  mode: Mode | null
  progressIndex: number | null
}

const defaultSession: ReadingActivitySession = {
  activityId: null,
  readingSessionId: null,
  completed: false,
  userId: null,
  textId: '',
  startTime: null,
  started: false,
  wpm: null,
  mode: null,
  progressIndex: null,
}

// Undefined means the initial auth state has not loaded. A null owner is a known guest.
let activeUserId: string | null | undefined

export function isReadingActivityOwner(userId: string | null): boolean {
  return activeUserId === userId
}

/** Bind the reader subtree before its effects restore or write a session. */
export function setReadingActivityOwner(userId: string | null): void {
  activeUserId = userId
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
    if (!stored) return
    const parsed = JSON.parse(stored) as ReadingActivitySession
    // Ownerless legacy records cannot safely be assigned to the current user.
    if (parsed?.userId !== userId) {
      sessionStorage.removeItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
    }
  } catch {
    // Storage may be unavailable. Ownership checks still protect callbacks.
  }
}

export function loadReadingActivitySession(
  userId: string | null
): ReadingActivitySession | null {
  if (!isReadingActivityOwner(userId)) return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
    if (!stored) return null
    const parsed = JSON.parse(stored) as ReadingActivitySession
    if (!parsed?.textId || parsed.userId !== userId) return null
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
  partial: Partial<Omit<ReadingActivitySession, 'userId'>>,
  userId: string | null
): ReadingActivitySession | null {
  if (!isReadingActivityOwner(userId)) return null
  const existing = loadReadingActivitySession(userId)
  const next: ReadingActivitySession = {
    ...defaultSession,
    ...existing,
    ...partial,
    userId,
    activityId:
      partial.activityId ??
      (existing?.textId === partial.textId || !partial.textId
        ? existing?.activityId
        : null) ??
      crypto.randomUUID(),
    readingSessionId:
      partial.readingSessionId ??
      (existing?.textId === partial.textId || !partial.textId
        ? existing?.readingSessionId
        : null) ??
      crypto.randomUUID(),
    completed:
      partial.completed ??
      (existing?.textId === partial.textId || !partial.textId
        ? existing?.completed
        : false) ??
      false,
  }

  if (!next.textId) return null
  saveReadingActivitySession(next)
  return next
}

export function clearReadingActivitySession(userId: string | null): void {
  if (!isReadingActivityOwner(userId)) return
  try {
    sessionStorage.removeItem(STORAGE_KEYS.READING_ACTIVITY_SESSION)
  } catch {
    // ignore storage errors
  }
}

export function rotateReadingActivitySession(
  userId: string | null
): ReadingActivitySession | null {
  const session = loadReadingActivitySession(userId)
  if (!session) return null
  return upsertReadingActivitySession(
    {
      activityId: crypto.randomUUID(),
      textId: session.textId,
      startTime: null,
      started: false,
      wpm: session.wpm,
      mode: session.mode,
      progressIndex: session.progressIndex,
    },
    userId
  )
}

import localforage from 'localforage'
import type { Text, TextPreview, Notification } from '../types/database'
import type { CollapsedActivitySession } from './getUserActivity'
import { CACHE_TTL, PREFETCH } from '../constants/offline'
import { pwaLogger } from '../utils/pwaLogger'

const TAG = 'offlineCache'

// --- Store instances ---

const textsStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'texts',
})

const libraryStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'library',
})

const activityStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'activity',
})

const metadataStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'metadata',
})

const notificationsStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'notifications',
})

const sectionQuizStore = localforage.createInstance({
  name: 'speye-offline',
  storeName: 'sectionQuiz',
})

// --- Generic cache helpers ---

interface CacheEntry<T> {
  data: T
  timestamp: number
}

async function getCached<T>(
  store: LocalForage,
  key: string,
  maxAgeMs: number
): Promise<T | null> {
  try {
    const entry = await store.getItem<CacheEntry<T>>(key)
    if (!entry) return null
    if (maxAgeMs !== Infinity && Date.now() - entry.timestamp > maxAgeMs) {
      pwaLogger.debug(TAG, `Cache expired for key="${key}"`)
      await store.removeItem(key)
      return null
    }
    return entry.data
  } catch (err) {
    pwaLogger.warn(TAG, `Failed to read cache key="${key}"`, err)
    return null
  }
}

async function setCached<T>(
  store: LocalForage,
  key: string,
  data: T
): Promise<void> {
  try {
    await store.setItem<CacheEntry<T>>(key, { data, timestamp: Date.now() })
  } catch (err) {
    pwaLogger.warn(
      TAG,
      `Failed to write cache key="${key}" (storage full?)`,
      err
    )
  }
}

// --- Typed wrappers ---

export async function getCachedText(textId: string): Promise<Text | null> {
  return getCached<Text>(textsStore, textId, CACHE_TTL.TEXT_CONTENT)
}

export async function setCachedText(text: Text): Promise<void> {
  await setCached(textsStore, text.id, text)
}

export async function getAllCachedTexts(): Promise<Text[]> {
  const texts: Text[] = []
  const expiredKeys: string[] = []
  try {
    await textsStore.iterate<CacheEntry<Text>, void>((entry, key) => {
      if (!entry?.data) return
      const expired =
        CACHE_TTL.TEXT_CONTENT !== Infinity &&
        Date.now() - entry.timestamp > CACHE_TTL.TEXT_CONTENT
      if (expired) {
        expiredKeys.push(key)
      } else {
        texts.push(entry.data)
      }
    })
  } catch {
    // Ignore iteration errors
  }
  // Prune expired entries so they don't accumulate in IndexedDB or inflate
  // getCacheStats counts.
  await Promise.all(expiredKeys.map((key) => textsStore.removeItem(key)))
  return texts
}

export async function getCachedLibraryTexts(
  key: string
): Promise<TextPreview[] | null> {
  return getCached<TextPreview[]>(libraryStore, key, CACHE_TTL.LIBRARY_LISTING)
}

export async function setCachedLibraryTexts(
  key: string,
  texts: TextPreview[]
): Promise<void> {
  await setCached(libraryStore, key, texts)
}

export async function getCachedActivity(
  userId: string
): Promise<CollapsedActivitySession[] | null> {
  return getCached<CollapsedActivitySession[]>(
    activityStore,
    userId,
    CACHE_TTL.ACTIVITY
  )
}

export async function setCachedActivity(
  userId: string,
  sessions: CollapsedActivitySession[]
): Promise<void> {
  await setCached(activityStore, userId, sessions)
}

export async function getCachedBestScores(
  userId: string
): Promise<Record<string, number> | null> {
  return getCached<Record<string, number>>(
    metadataStore,
    `bestScores:${userId}`,
    CACHE_TTL.BEST_SCORES
  )
}

export async function setCachedBestScores(
  userId: string,
  scores: Record<string, number>
): Promise<void> {
  await setCached(metadataStore, `bestScores:${userId}`, scores)
}

export async function getCachedLastPosition(
  textId: string
): Promise<number | null> {
  return getCached<number>(
    metadataStore,
    `lastPosition:${textId}`,
    CACHE_TTL.LAST_POSITION
  )
}

export async function setCachedLastPosition(
  textId: string,
  position: number
): Promise<void> {
  await setCached(metadataStore, `lastPosition:${textId}`, position)
}

export async function getCachedNotifications(
  userId: string
): Promise<Notification[] | null> {
  return getCached<Notification[]>(
    notificationsStore,
    userId,
    CACHE_TTL.NOTIFICATIONS
  )
}

export async function setCachedNotifications(
  userId: string,
  notifications: Notification[]
): Promise<void> {
  await setCached(notificationsStore, userId, notifications)
}

// --- Section quiz progress (sectional texts) ---

export interface SectionQuizProgress {
  results: ({ correct: number; total: number } | null)[]
  quizzedSectionIds: number[]
}

export async function getSectionQuizProgress(
  textId: string
): Promise<SectionQuizProgress | null> {
  return getCached<SectionQuizProgress>(sectionQuizStore, textId, Infinity)
}

export async function setSectionQuizProgress(
  textId: string,
  progress: SectionQuizProgress
): Promise<void> {
  await setCached(sectionQuizStore, textId, progress)
}

export async function clearSectionQuizProgress(textId: string): Promise<void> {
  try {
    await sectionQuizStore.removeItem(textId)
  } catch (err) {
    pwaLogger.warn(
      TAG,
      `Failed to clear section quiz progress for textId="${textId}"`,
      err
    )
  }
}

export async function getCachedQuiz(
  textId: string
): Promise<Text['quiz'] | null> {
  const text = await getCachedText(textId)
  return text?.quiz ?? null
}

// --- Cache management ---

export async function getCacheStats(): Promise<{
  textCount: number
  totalSizeEstimate: number
  lastSyncTime: number | null
}> {
  const texts = await getAllCachedTexts()
  const totalSizeEstimate = texts.reduce(
    (acc, t) => acc + JSON.stringify(t).length,
    0
  )

  const lastSync = await getCached<number>(
    metadataStore,
    'lastSyncTime',
    Infinity
  )

  return {
    textCount: texts.length,
    totalSizeEstimate,
    lastSyncTime: lastSync,
  }
}

export async function setLastSyncTime(): Promise<void> {
  await setCached(metadataStore, 'lastSyncTime', Date.now())
}

export async function clearAllCaches(): Promise<void> {
  pwaLogger.info(TAG, 'Clearing all offline caches')
  // Preserve lastSyncTime so the "Last synced" UI doesn't reset to "Never"
  // after a cache clear. bestScores and lastPosition entries are fine to drop
  // since they are refetched from the DB on next load.
  const lastSync = await getCached<number>(
    metadataStore,
    'lastSyncTime',
    Infinity
  )
  await Promise.all([
    textsStore.clear(),
    libraryStore.clear(),
    activityStore.clear(),
    metadataStore.clear(),
    notificationsStore.clear(),
    sectionQuizStore.clear(),
  ])
  if (lastSync !== null) {
    await setCached(metadataStore, 'lastSyncTime', lastSync)
  }
  try {
    localStorage.removeItem(PREFETCH.COOLDOWN_KEY)
  } catch {
    // Ignore
  }
}

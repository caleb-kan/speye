import {
  fetchPublicLibraryTexts,
  fetchUserLibraryTexts,
} from './libraryService'
import { getCachedText, setCachedText } from './offlineCache'
import { getTextById } from './textService'
import { pwaLogger } from '../utils/pwaLogger'
import type { Text } from '../types/database'
import { isOffline } from './networkStatus'
import { getCurrentUser } from './authService'
import { PREFETCH } from '../constants/offline'

const TAG = 'prefetchService'

const BATCH_SIZE = 10

// Module-level lock to prevent concurrent prefetch runs (e.g. auto-trigger
// and manual "Save offline" button firing within the cooldown window).
let isPrefetchingNow = false

async function prefetchBatch(textIds: string[]): Promise<void> {
  // Fetch all texts in the batch in parallel, with individual error handling
  // so one failure doesn't abort the rest.
  await Promise.all(
    textIds.map(async (id) => {
      if (isOffline()) return

      try {
        const cached = await getCachedText(id)
        if (cached) return

        const text = await getTextById(id)
        if (text) {
          await setCachedText(text as Text)
        }
      } catch (err) {
        pwaLogger.warn(TAG, `Failed to prefetch text ${id} (non-critical)`, err)
      }
    })
  )
}

export async function prefetchAllTexts(): Promise<void> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Skipping prefetch — offline')
    return
  }

  if (isPrefetchingNow) {
    pwaLogger.debug(TAG, 'Skipping prefetch — already in progress')
    return
  }

  // Check cooldown
  try {
    const lastPrefetch = localStorage.getItem(PREFETCH.COOLDOWN_KEY)
    if (
      lastPrefetch &&
      Date.now() - Number(lastPrefetch) < PREFETCH.COOLDOWN_MS
    ) {
      pwaLogger.debug(TAG, 'Skipping prefetch — cooldown active')
      return
    }
  } catch {
    // Ignore localStorage errors
  }

  // Must be authenticated
  const user = await getCurrentUser()
  if (!user) {
    pwaLogger.debug(TAG, 'Skipping prefetch — not authenticated')
    return
  }

  isPrefetchingNow = true
  try {
    pwaLogger.info(TAG, 'Starting background prefetch')

    // Fetch library listings (these also get cached by the service functions)
    const [publicTexts, userTexts] = await Promise.all([
      fetchPublicLibraryTexts(),
      fetchUserLibraryTexts(user.id),
    ])

    // Collect all unique text IDs
    const allIds = new Set<string>()
    for (const t of publicTexts) allIds.add(t.id)
    for (const t of userTexts) allIds.add(t.id)

    const idsArray = Array.from(allIds)
    pwaLogger.debug(
      TAG,
      `Prefetching ${idsArray.length} unique texts in batches of ${BATCH_SIZE}`
    )

    // Fetch in batches using requestIdleCallback where available
    for (let i = 0; i < idsArray.length; i += BATCH_SIZE) {
      if (isOffline()) {
        pwaLogger.debug(TAG, 'Aborting prefetch — went offline')
        return
      }

      const batch = idsArray.slice(i, i + BATCH_SIZE)
      await new Promise<void>((resolve) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(
            () => {
              prefetchBatch(batch)
                .then(resolve)
                .catch(() => resolve())
            },
            { timeout: 2000 }
          )
        } else {
          setTimeout(() => {
            prefetchBatch(batch)
              .then(resolve)
              .catch(() => resolve())
          }, 100)
        }
      })
    }

    pwaLogger.info(TAG, 'Prefetch complete')

    // Mark cooldown
    try {
      localStorage.setItem(PREFETCH.COOLDOWN_KEY, String(Date.now()))
    } catch {
      // Ignore
    }
  } catch (err) {
    pwaLogger.error(TAG, 'Prefetch failed (non-critical)', err)
  } finally {
    isPrefetchingNow = false
  }
}

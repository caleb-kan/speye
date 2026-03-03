import { getRandomText as getRandomTextDb } from '../../../backend/supabase/database/texts/getRandomText'
import { getTextById as getTextByIdDb } from '../../../backend/supabase/database/texts/getTextById'
import { getAllCachedTexts, getCachedText, setCachedText } from './offlineCache'
import { pwaLogger } from '../utils/pwaLogger'
import type { Text } from '../types/database'
import { isOffline } from './networkStatus'

const TAG = 'textService'

export type GetRandomTextFilters = {
  fiction: boolean
  complexityMin: number
  complexityMax: number
}

export async function getRandomText(
  filters: GetRandomTextFilters
): Promise<Text | null> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — picking from cached texts', filters)
    return pickFromCache(filters)
  }

  try {
    const text = await getRandomTextDb(filters)
    if (text) {
      void setCachedText(text)
    }
    return text
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for random text, falling back to cache',
      err
    )
    const cached = await pickFromCache(filters)
    if (cached) return cached
    // No cache available either — re-throw so callers can show an error state
    throw err
  }
}

export async function getTextById(id: string): Promise<Text | null> {
  if (isOffline()) {
    pwaLogger.debug(TAG, 'Offline — returning cached text', { id })
    return (await getCachedText(id)) ?? null
  }

  try {
    const text = await getTextByIdDb(id)
    if (text) {
      void setCachedText(text as Text)
    }
    return text as Text | null
  } catch (err) {
    pwaLogger.warn(
      TAG,
      'Network fetch failed for text, falling back to cache',
      err
    )
    const cached = await getCachedText(id)
    if (cached) return cached
    throw err
  }
}

async function pickFromCache(
  filters: GetRandomTextFilters
): Promise<Text | null> {
  const cachedTexts = await getAllCachedTexts()
  const matching = cachedTexts.filter((t) => {
    if (t.owner_id !== null) return false
    if (t.fiction !== filters.fiction) return false
    const c = t.complexity ?? 0
    if (c < filters.complexityMin || c > filters.complexityMax) return false
    return t.content && t.processing_status === 'completed'
  })

  pwaLogger.debug(
    TAG,
    `Cache: ${matching.length}/${cachedTexts.length} texts match filters`
  )

  if (matching.length === 0) return null
  return matching[Math.floor(Math.random() * matching.length)]
}

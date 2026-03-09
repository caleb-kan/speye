import { supabase } from '../../../lib/supabase'
import { getLastReadingPosition as getLastReadingPositionDb } from '../../../backend/supabase/database/userActivity/getLastReadingPosition'
import { getCachedLastPosition, setCachedLastPosition } from './offlineCache'
import { pwaLogger } from '../utils/pwaLogger'
import { isOffline } from './networkStatus'

const TAG = 'readingHistory'

export async function getLastReadingPosition(
  textId: string
): Promise<number | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user

    if (!user) return null

    if (isOffline()) {
      pwaLogger.debug(TAG, 'Offline — returning cached reading position', {
        textId,
      })
      return await getCachedLastPosition(textId)
    }

    try {
      const position = await getLastReadingPositionDb(user.id, textId)
      if (position !== null) {
        void setCachedLastPosition(textId, position)
      }
      return position
    } catch (err) {
      pwaLogger.warn(
        TAG,
        'Network fetch failed for reading position, falling back to cache',
        err
      )
      return await getCachedLastPosition(textId)
    }
  } catch (err) {
    pwaLogger.error(TAG, 'Failed to restore reading position', err)
    return null
  }
}

import { supabase } from '../../../lib/supabase'
import { getLastReadingPosition as getLastReadingPositionDb } from '../../../backend/supabase/database/userActivity/getLastReadingPosition'

export async function getLastReadingPosition(
  textId: string
): Promise<number | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user

    if (!user) return null

    return await getLastReadingPositionDb(user.id, textId)
  } catch (err) {
    console.error('Failed to restore reading position:', err)
    return null
  }
}

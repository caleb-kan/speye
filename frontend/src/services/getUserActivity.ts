import {
  getUserActivity as getUserActivityDb,
  type ActivitySession,
} from '../../../backend/supabase/database/userActivity/getUserActivity'
import { getErrorMessage } from '../utils/getErrorMessage'

export type { ActivitySession }

export async function getUserActivity(
  userId: string
): Promise<ActivitySession[]> {
  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    return await getUserActivityDb(userId)
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to load activity'))
  }
}

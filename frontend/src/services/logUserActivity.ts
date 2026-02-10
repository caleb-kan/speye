import {
  logUserActivity as logUserActivityDb,
  logUserActivityOnUnload as logUserActivityOnUnloadDb,
  type UserActivityLogParams,
} from '../../../backend/supabase/database/userActivity/logUserActivity'
import { getErrorMessage } from '../utils/getErrorMessage'

export type { UserActivityLogParams }

export async function logUserActivity(params: UserActivityLogParams) {
  try {
    return await logUserActivityDb(params)
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Failed to log activity'))
  }
}

export function logUserActivityOnUnload(
  params: UserActivityLogParams,
  accessToken: string | null | undefined,
  userId: string | null | undefined
) {
  return logUserActivityOnUnloadDb(params, accessToken, userId)
}

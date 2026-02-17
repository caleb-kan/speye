import {
  getUsersUsernames as getUsersUsernamesDb,
  type UsernameRecord,
} from '../../../backend/supabase/database/users/getUsersUsernames'
import { promoteUserToAdmin as promoteUserToAdminDb } from '../../../backend/supabase/database/users/promoteUserToAdmin'
import { getUserByUsername as getUserByUsernameDb } from '../../../backend/supabase/database/users/getUserByUsername'

export type { UsernameRecord }

export async function getUsersUsernames(): Promise<UsernameRecord[]> {
  return getUsersUsernamesDb()
}

export async function promoteToAdmin(targetUserId: string): Promise<void> {
  return promoteUserToAdminDb(targetUserId)
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const user = await getUserByUsernameDb(username)
  return user === null
}

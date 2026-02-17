import {
  getUsers as getUsersDb,
  type UserRecord,
} from '../../../backend/supabase/database/users/getUsers'
import { promoteUserToAdmin as promoteUserToAdminDb } from '../../../backend/supabase/database/users/promoteUserToAdmin'

export type { UserRecord }

export const getUsers = async (): Promise<UserRecord[]> => {
  return getUsersDb()
}

export const promoteToAdmin = async (targetUserId: string): Promise<void> => {
  return promoteUserToAdminDb(targetUserId)
}

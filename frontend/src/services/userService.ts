import {
  getUsers as getUsersDb,
  type UserRecord,
} from '../../../backend/supabase/database/users/getUsers'

export type { UserRecord }

export const getUsers = async (): Promise<UserRecord[]> => {
  return getUsersDb()
}

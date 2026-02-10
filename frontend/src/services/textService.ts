import { getRandomText as getRandomTextDb } from '../../../backend/supabase/database/texts/getRandomText'
import type { Text } from '../types/database'

export type GetRandomTextFilters = {
  fiction: boolean
  complexityMin: number
  complexityMax: number
}

export async function getRandomText(
  filters: GetRandomTextFilters
): Promise<Text | null> {
  return getRandomTextDb(filters)
}

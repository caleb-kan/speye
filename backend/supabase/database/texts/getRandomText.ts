import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export interface FetchTextsFilters {
  fiction: boolean
  complexityMin: number
  complexityMax: number
}

export async function getRandomText(filters: FetchTextsFilters) {
  const { data, error } = await supabase.rpc('get_random_text', {
    fiction_filter: filters.fiction,
    complexity_min: filters.complexityMin,
    complexity_max: filters.complexityMax,
  })

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return data?.[0] ?? null
}

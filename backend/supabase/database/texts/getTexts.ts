import { supabase } from '../../../../lib/supabase'

export interface FetchTextsInput {
  fiction: boolean
  difficultyMin: number
  difficultyMax: number
}

export async function getTexts(data: FetchTextsInput) {
  const { data: result, error } = await supabase
    .from('texts')
    .select('*')
    .eq('fiction', data.fiction)
    .gte('readability', data.difficultyMin)
    .lte('readability', data.difficultyMax)

  if (error) {
    throw error
  }

  return result
}

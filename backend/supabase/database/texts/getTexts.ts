import { supabase } from '../../../../lib/supabase'

export interface FetchTextsInput {
  fiction: boolean
  complexityMin: number
  complexityMax: number
}

export async function getTexts(data: FetchTextsInput) {
  const { data: result, error } = await supabase
    .from('texts')
    .select('*')
    .eq('fiction', data.fiction)
    .gte('complexity', data.complexityMin)
    .lte('complexity', data.complexityMax)

  if (error) {
    throw error
  }

  return result
}

import { supabase } from '../../../../lib/supabase'
import { calculateComplexity } from '../../functions/textStat'

export interface UploadTextInput {
  content: string
  fiction: boolean
}

export async function uploadText(userId: string, data: UploadTextInput) {
  const complexity = calculateComplexity(data.content)

  const { data: result, error } = await supabase
    .from('texts')
    .insert([
      {
        owner_id: userId,
        content: data.content,
        fiction: data.fiction,
        complexity: complexity,
      },
    ])
    .select()
    .single()

  if (error) {
    throw error
  }

  return result
}

import { supabase } from '../../../../lib/supabase'
import { calculateComplexity } from '../../functions/textStat'

export interface UploadTextInput {
  title: string | null
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
        title: data.title,
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

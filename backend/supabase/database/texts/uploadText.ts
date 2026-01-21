import { supabase } from '../../../../lib/supabase'
import { calculateReadability } from '../../functions/textStat'

export interface UploadTextInput {
  content: string
  fiction: boolean
}

export async function uploadText(userId: string, data: UploadTextInput) {
  const readability = calculateReadability(data.content)

  const { data: result, error } = await supabase
    .from('texts')
    .insert([
      {
        owner_id: userId,
        content: data.content,
        fiction: data.fiction,
        readability: readability,
      },
    ])
    .select()
    .single()

  if (error) {
    throw error
  }

  return result
}

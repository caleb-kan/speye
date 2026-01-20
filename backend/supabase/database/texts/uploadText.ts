import { supabase } from '../../../../lib/supabase'

export interface UploadTextInput {
  content: string
  fiction: boolean
  isPublic: boolean
}

export async function uploadText(userId: string, data: UploadTextInput) {
  const { data: result, error } = await supabase
    .from('texts')
    .insert([
      {
        owner_id: userId,
        content: data.content,
        fiction: data.fiction,
        is_public: data.isPublic,
      },
    ])
    .select()
    .single()

  if (error) {
    throw error
  }

  return result
}

import { supabase } from '../../../../lib/supabase'

export async function deleteText(textId: string): Promise<void> {
  const { error } = await supabase.from('texts').delete().eq('id', textId)

  if (error) {
    throw error
  }
}

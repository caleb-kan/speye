import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function deleteText(textId: string): Promise<void> {
  const { error } = await supabase.from('texts').delete().eq('id', textId)

  logDbQuery({
    table: 'texts',
    action: 'DELETE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }
}

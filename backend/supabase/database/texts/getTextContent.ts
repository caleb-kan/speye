import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function getTextContent(textId: string) {
  const { data, error } = await supabase
    .from('texts')
    .select('content')
    .eq('id', textId)
    .single()

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error || typeof data.content !== 'string') {
    throw error
  }

  return data.content
}

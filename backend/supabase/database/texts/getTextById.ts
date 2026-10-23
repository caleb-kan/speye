import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { TextRecord as Text } from './types'

export async function getTextById(textId: string): Promise<Text | null> {
  const { data, error } = await supabase
    .from('texts')
    .select('*')
    .eq('id', textId)
    .maybeSingle()

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  return data as Text | null
}

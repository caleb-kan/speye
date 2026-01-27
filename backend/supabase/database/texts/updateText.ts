import { supabase } from '../../../../lib/supabase'
import { calculateComplexity } from '../../functions/textStat'
import { logDbQuery } from '../logger'
import type { TextInput, TextRecord } from './types'

export type { TextInput }

export async function updateText(
  textId: string,
  data: TextInput
): Promise<TextRecord> {
  const complexity = calculateComplexity(data.content)

  const { data: result, error } = await supabase
    .from('texts')
    .update({
      title: data.title,
      content: data.content,
      fiction: data.fiction,
      complexity: complexity,
    })
    .eq('id', textId)
    .select()
    .single()

  logDbQuery({
    table: 'texts',
    action: 'UPDATE',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return result as TextRecord
}

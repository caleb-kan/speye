import { supabase } from '../../../../lib/supabase'
import { calculateComplexity } from '../../functions/textStat'
import type { TextInput, TextRecord } from './types'
import { logDbQuery } from '../logger'

export type { TextInput }

export async function uploadText(
  userId: string,
  data: TextInput
): Promise<TextRecord> {
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

  logDbQuery({
    table: 'texts',
    action: 'INSERT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    throw error
  }

  return result as TextRecord
}

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
      content: data.content,
      complexity: complexity,
      // Optional fields - only include if provided
      ...(data.title !== undefined && { title: data.title }),
      ...(data.fiction !== undefined && { fiction: data.fiction }),
      ...(data.quiz !== undefined && { quiz: data.quiz }),
      ...(data.processing_status !== undefined && {
        processing_status: data.processing_status,
      }),
      // Reset quiz_valid when reprocessing
      ...(data.quiz_valid !== undefined && { quiz_valid: data.quiz_valid }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.sectional !== undefined && { sectional: data.sectional }),
      ...(data.section_content !== undefined && {
        section_content: data.section_content,
      }),
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

import { supabase } from '../../../../lib/supabase'
import { calculateComplexity } from '../../functions/textStat'
import type { TextInput, TextRecord } from './types'
import { logDbQuery } from '../logger'

export type { TextInput }

/**
 * For sectional texts the `content` column stores the first section's content
 * (used for complexity calculation and as fallback display text).
 */
function getRepresentativeContent(data: TextInput): string {
  if (
    data.sectional &&
    data.section_content &&
    data.section_content.length > 0
  ) {
    return data.section_content[0].content
  }
  return data.content
}

export async function uploadText(
  userId: string,
  data: TextInput
): Promise<TextRecord> {
  const representativeContent = getRepresentativeContent(data)
  const complexity = calculateComplexity(representativeContent)

  const { data: result, error } = await supabase
    .from('texts')
    .insert([
      {
        owner_id: data.isPublic ? null : userId,
        content: data.content,
        complexity: complexity,
        ...(data.title !== undefined && { title: data.title }),
        ...(data.fiction !== undefined && { fiction: data.fiction }),
        ...(data.quiz !== undefined && { quiz: data.quiz }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.processing_status !== undefined && {
          processing_status: data.processing_status,
        }),
        ...(data.sectional !== undefined && { sectional: data.sectional }),
        ...(data.section_content !== undefined && {
          section_content: data.section_content,
        }),
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

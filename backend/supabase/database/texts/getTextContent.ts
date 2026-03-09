import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function getTextContent(
  textId: string
): Promise<{ content: string; summary: string | null }> {
  const { data, error } = await supabase
    .from('texts')
    .select('content, summary')
    .eq('id', textId)
    .single()

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data || typeof data.content !== 'string') {
    throw new Error('Text not found or content is invalid')
  }

  return {
    content: data.content,
    summary: (data.summary as string | null) ?? null,
  }
}

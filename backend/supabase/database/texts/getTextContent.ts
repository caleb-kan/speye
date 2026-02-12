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

  if (error || typeof data.content !== 'string') {
    throw error
  }

  return {
    content: data.content,
    summary: (data.summary as string | null) ?? null,
  }
}

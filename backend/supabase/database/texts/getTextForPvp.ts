import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { PvpTextData } from './types'

export async function getTextForPvp(
  textId: string
): Promise<PvpTextData | null> {
  const { data, error } = await supabase
    .from('texts')
    .select('id, title, content, source, fiction, complexity, quiz')
    .eq('id', textId)
    .eq('processing_status', 'completed')
    .eq('quiz_valid', true)
    .eq('admin_decision', 'approved')
    .eq('sectional', false)
    .maybeSingle()

  logDbQuery({
    table: 'texts',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) throw error
  if (!data) return null
  if (!data.quiz) {
    throw new Error('PvP text has no quiz despite passing validation filters')
  }
  return { ...data, quiz: data.quiz }
}

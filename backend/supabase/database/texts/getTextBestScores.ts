import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'

export async function getTextBestScores(
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('text_id, score')
    .eq('user_id', userId)

  logDbQuery({
    table: 'user_activity',
    action: 'SELECT',
    errors: error ? error.message : undefined,
  })

  if (error) {
    console.error('Error fetching best scores:', error)
    return {}
  }

  // Reduce to find the max score per text_id
  const bestScores: Record<string, number> = {}

  data.forEach((quiz) => {
    const currentMax = bestScores[quiz.text_id] || 0
    if (quiz.score > currentMax) {
      bestScores[quiz.text_id] = quiz.score
    }
  })

  return bestScores
}

import { supabase } from '../../../lib/supabase'

export interface ActivitySession {
  id: string
  text_id: string
  wpm: number
  score: number | null
  end_time: string | null
  text: {
    title: string
    fiction: boolean
    complexity: number
  } | null
}

export async function getUserActivity(
  userId: string
): Promise<ActivitySession[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select(
      `
      id,
      text_id,
      wpm,
      score,
      end_time,
      text:texts (
        title,
        fiction,
        complexity
      )
    `
    )
    .eq('user_id', userId)
    .order('end_time', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data as unknown as ActivitySession[]
}

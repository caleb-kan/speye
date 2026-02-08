import { supabase } from '../../../lib/supabase'
import type { Mode } from '../types/reading'

export type UserActivityLogParams = {
  textId: string
  wpm: number
  startTime: string
  endTime?: string
  mode: Mode
  progressIndex: number
}

export async function logUserActivity(params: UserActivityLogParams) {
  if (params.progressIndex <= 0) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_activity')
    .insert({
      user_id: user.id,
      text_id: params.textId,
      wpm: params.wpm,
      start_time: params.startTime,
      end_time: params.endTime ?? new Date().toISOString(),
      mode: params.mode,
      progress_index: params.progressIndex,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to log user activity: ${error.message}`)
  }

  return data
}

export function logUserActivityOnUnload(
  params: UserActivityLogParams,
  accessToken: string | null | undefined,
  userId: string | null | undefined
) {
  if (params.progressIndex <= 0) return
  if (!accessToken || !userId) return
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!supabaseUrl || !supabaseKey) return

  const url = `${supabaseUrl}/rest/v1/user_activity`
  const body = JSON.stringify({
    user_id: userId,
    text_id: params.textId,
    wpm: params.wpm,
    start_time: params.startTime,
    end_time: params.endTime ?? new Date().toISOString(),
    mode: params.mode,
    progress_index: params.progressIndex,
  })

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=minimal',
    },
    body,
    keepalive: true,
  })
}

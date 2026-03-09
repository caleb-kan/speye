import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { Mode } from './types'

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

  logDbQuery({
    table: 'user_activity',
    action: 'INSERT',
    errors: error ? error.message : undefined,
  })

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
  const env = (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>
    }
  ).env
  const supabaseUrl = env?.VITE_SUPABASE_URL
  const supabaseKey = env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
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

  logDbQuery({
    table: 'user_activity',
    action: 'REST:INSERT',
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

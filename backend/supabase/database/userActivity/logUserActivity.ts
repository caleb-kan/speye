import { supabase } from '../../../../lib/supabase'
import { logDbQuery } from '../logger'
import type { Mode } from './types'

export type UserActivityLogParams = {
  // Kept across retries. Optional for callers and queues predating replay IDs.
  id?: string
  textId: string
  wpm: number
  startTime: string
  endTime?: string
  mode: Mode
  progressIndex: number
}

export async function logUserActivity(
  params: UserActivityLogParams,
  expectedUserId?: string
) {
  if (params.progressIndex <= 0) return null
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw authError
  if (!user || (expectedUserId && user.id !== expectedUserId)) return null

  const { data, error } = await supabase
    .from('user_activity')
    .upsert(
      {
        id: params.id ?? crypto.randomUUID(),
        user_id: user.id,
        text_id: params.textId,
        wpm: params.wpm,
        start_time: params.startTime,
        end_time: params.endTime ?? new Date().toISOString(),
        mode: params.mode,
        progress_index: params.progressIndex,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle()

  logDbQuery({
    table: 'user_activity',
    action: 'UPSERT',
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

  const url = `${supabaseUrl}/rest/v1/user_activity?on_conflict=id`
  const body = JSON.stringify({
    id: params.id ?? crypto.randomUUID(),
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
    action: 'REST:UPSERT',
  })

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body,
    keepalive: true,
  })
}

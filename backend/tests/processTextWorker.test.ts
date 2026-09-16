import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

function setup({
  initialStatus = 'pending',
  completeDuringFetch = false,
  failUpdate = false,
  completeOnUpdateError = true,
  persistenceFails = false,
  processFails = true,
  initialQuizValid = null as boolean | null,
  sendFailure = null as 'error' | 'throw' | null,
  failQuizFallback = false,
  changeDuringSend = null as 'status' | 'owner' | 'validated' | null,
} = {}) {
  const row: Record<string, unknown> = {
    id: 'text-1',
    content: 'Example text',
    title: 'Example',
    fiction: false,
    admin_decision: 'approved',
    owner_id: 'user-1',
    sectional: false,
    section_content: null,
    processing_status: initialStatus,
    quiz_valid: initialQuizValid,
  }
  const notifications: unknown[] = []
  let updates = 0
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = []
    let values: Record<string, unknown> | undefined
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push([column, value])
        return query
      },
      is: (column: string, value: unknown) => {
        filters.push([column, value])
        return query
      },
      maybeSingle: async () => ({ data: { ...row }, error: null }),
      update: (value: Record<string, unknown>) => {
        values = value
        return query
      },
      insert: async (value: unknown) => {
        notifications.push(value)
        return { error: null }
      },
      then: (resolve: (value: unknown) => unknown) => {
        updates++
        if (
          persistenceFails ||
          (failUpdate && updates === 1) ||
          (failQuizFallback && values?.quiz_valid === false)
        ) {
          if (failUpdate && completeOnUpdateError)
            row.processing_status = 'completed'
          return Promise.resolve({
            error: { message: 'write failed' },
            count: null,
          }).then(resolve)
        }
        const matches = filters.every(
          ([column, value]) => row[column] === value
        )
        if (table === 'texts' && matches) Object.assign(row, values)
        return Promise.resolve({ error: null, count: matches ? 1 : 0 }).then(
          resolve
        )
      },
    }
    return query
  }
  let sends = 0
  const rpc = vi.fn(async (name: string) => {
    if (name === 'send') {
      sends++
      if (sends === 1 && sendFailure) {
        if (changeDuringSend === 'status') row.processing_status = 'pending'
        if (changeDuringSend === 'owner') row.owner_id = 'new-owner'
        if (changeDuringSend === 'validated') row.quiz_valid = true
        if (sendFailure === 'throw') throw new TypeError('Queue unavailable')
        return { data: null, error: { message: 'Queue unavailable' } }
      }
    }
    return {
      data:
        name === 'read'
          ? [{ msg_id: 1, message: { text_id: 'text-1' } }]
          : null,
      error: null,
    }
  })
  const fetch = vi.fn(async () => {
    if (completeDuringFetch) row.processing_status = 'completed'
    return new Response(
      JSON.stringify(
        processFails
          ? { error: 'unavailable' }
          : {
              title: 'Example',
              questionSets: [],
              fiction: false,
              summary: 'Summary',
            }
      ),
      { status: processFails ? 503 : 200 }
    )
  })
  const handler = loadEdgeFunction('process-text-worker', {
    modules: {
      'jsr:@supabase/supabase-js@2': { createClient: () => ({ from, rpc }) },
    },
    fetch,
  })
  const run = () =>
    handler(
      new Request('http://edge.invalid', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-service-key' },
      })
    )
  return { run, row, notifications, fetch, rpc }
}

describe('process-text worker idempotence', () => {
  it('skips an already completed job before spending another LLM request', async () => {
    const { run, row, fetch, notifications } = setup({
      initialStatus: 'completed',
    })
    expect((await run()).status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
    expect(row.processing_status).toBe('completed')
    expect(notifications).toEqual([])
  })

  it('does not let a concurrent failed attempt overwrite completed processing', async () => {
    const { run, row, notifications } = setup({ completeDuringFetch: true })
    expect((await run()).status).toBe(200)
    expect(row.processing_status).toBe('completed')
    expect(notifications).toEqual([])
  })

  it('keeps failure handling and owner notification for a pending job', async () => {
    const { run, row, notifications } = setup()
    expect((await run()).status).toBe(500)
    expect(row.processing_status).toBe('failed')
    expect(notifications).toHaveLength(1)
  })

  it('does not downgrade another worker success during the update-error fallback', async () => {
    const { run, row } = setup({ failUpdate: true, processFails: false })
    expect((await run()).status).toBe(500)
    expect(row.processing_status).toBe('completed')
  })

  it('processes a pending job and queues quiz validation', async () => {
    const { run, row, rpc } = setup({ processFails: false })
    expect((await run()).status).toBe(200)
    expect(row.processing_status).toBe('completed')
    expect(rpc).toHaveBeenCalledWith('send', {
      queue_name: 'validate_quiz',
      message: { text_id: 'text-1' },
    })
  })

  it('acknowledges a persisted fallback failure so manual retry remains available', async () => {
    const { run, row, rpc } = setup({
      failUpdate: true,
      completeOnUpdateError: false,
      processFails: false,
    })
    expect((await run()).status).toBe(500)
    expect(row.processing_status).toBe('failed')
    expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
  })

  it.each([true, false])(
    'retains the queue message if database persistence fails (process failure: %s)',
    async (processFails) => {
      const { run, row, rpc, notifications } = setup({
        processFails,
        persistenceFails: true,
      })
      expect((await run()).status).toBe(500)
      expect(row.processing_status).toBe('pending')
      expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
      expect(notifications).toEqual([])
    }
  )

  it.each(['error', 'throw'] as const)(
    'recovers a lost validation handoff after a queue %s without processing the text again',
    async (sendFailure) => {
      const { run, row, rpc, fetch } = setup({
        processFails: false,
        sendFailure,
        failQuizFallback: true,
      })
      expect((await run()).status).toBe(500)
      expect(row.processing_status).toBe('completed')
      expect(row.quiz_valid).toBeNull()
      expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
      expect((await run()).status).toBe(200)
      expect(rpc.mock.calls.filter(([name]) => name === 'send')).toHaveLength(2)
      expect(fetch).toHaveBeenCalledOnce()
      expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
    }
  )

  it.each([true, false])(
    'does not resubmit completed validation with result %s',
    async (initialQuizValid) => {
      const { run, rpc, fetch } = setup({
        initialStatus: 'completed',
        initialQuizValid,
      })
      expect((await run()).status).toBe(200)
      expect(rpc).not.toHaveBeenCalledWith('send', expect.anything())
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it.each(['error', 'throw'] as const)(
    'keeps the manual retry path after a queue %s when failure state can be persisted',
    async (sendFailure) => {
      const { run, row, rpc } = setup({ processFails: false, sendFailure })
      expect((await run()).status).toBe(200)
      expect(row.quiz_valid).toBe(false)
      expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
    }
  )

  it.each(['status', 'owner', 'validated'] as const)(
    'does not overwrite a newer text change during failed handoff (%s)',
    async (changeDuringSend) => {
      const { run, row } = setup({
        processFails: false,
        sendFailure: 'error',
        changeDuringSend,
      })
      expect((await run()).status).toBe(200)
      expect(row.quiz_valid).toBe(
        changeDuringSend === 'validated' ? true : null
      )
    }
  )
})

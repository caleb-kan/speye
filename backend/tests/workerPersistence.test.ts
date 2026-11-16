import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

function setup(
  name: string,
  options: {
    readError?: boolean
    readThrows?: boolean
    missing?: boolean
    writeError?: boolean
    writeThrows?: boolean
    upstreamFails?: boolean
    upstreamThrows?: boolean
    rejectionError?: boolean
    deleteError?: boolean
    deleteThrows?: boolean
    alreadyFinished?: boolean
  } = {}
) {
  const text = {
    content: 'Example',
    title: 'Example',
    owner_id: null,
    fiction: false,
    processing_status:
      options.alreadyFinished || name === 'validate-quiz-worker'
        ? 'completed'
        : 'pending',
    quiz_valid: options.alreadyFinished ? true : null,
    quiz: { questionSets: [] },
    admin_decision: 'pending',
    sectional: false,
    section_content: null,
    worker_revision: 'revision-1',
  }
  const read = async () => {
    if (options.readThrows) throw new TypeError('Connection unavailable')
    return {
      data: options.missing || options.readError ? null : text,
      error: options.readError ? { message: 'Connection unavailable' } : null,
    }
  }
  const from = () => {
    let update: Record<string, unknown> = {}
    const query = {
      select: () => query,
      eq: () => query,
      neq: () => query,
      single: read,
      maybeSingle: read,
      update: (value: Record<string, unknown>) => {
        update = value
        return query
      },
      then: (
        resolve: (result: unknown) => unknown,
        reject: (error: unknown) => unknown
      ) => {
        if (options.writeThrows)
          return Promise.reject(new TypeError('Connection unavailable')).then(
            resolve,
            reject
          )
        return Promise.resolve({
          data: [{ worker_revision: 'revision-2' }],
          count: 1,
          error:
            options.writeError ||
            (options.rejectionError &&
              update.rejection_stage === 'validate_quiz')
              ? { message: 'Write unavailable' }
              : null,
        }).then(resolve, reject)
      },
    }
    return query
  }
  const rpc = vi.fn(async (method: string) => {
    if (method === 'delete' && options.deleteThrows)
      throw new TypeError('Delete unavailable')
    return {
      data:
        method === 'read'
          ? [{ msg_id: 7, message: { text_id: 'text-1' } }]
          : null,
      error:
        method === 'delete' && options.deleteError
          ? { message: 'Delete unavailable' }
          : null,
    }
  })
  const fetch = vi.fn(async () => {
    if (options.upstreamThrows) throw new TypeError('Network unavailable')
    return new Response(
      JSON.stringify(
        options.upstreamFails
          ? { error: 'Unavailable' }
          : {
              title: 'Example',
              questionSets: [],
              fiction: false,
              summary: 'Summary',
              isValid: !options.rejectionError,
            }
      ),
      { status: options.upstreamFails ? 503 : 200 }
    )
  })
  const handler = loadEdgeFunction(name, {
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
  return { run, rpc, fetch }
}

describe.each(['process-text-worker', 'validate-quiz-worker'])(
  '%s queue retention',
  (name) => {
    it('acknowledges a successfully persisted result', async () => {
      const { run, rpc } = setup(name)
      expect((await run()).status).toBe(200)
      expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
    })

    it.each([
      { deleteError: true },
      { deleteThrows: true },
      { deleteError: true, alreadyFinished: true },
      { deleteThrows: true, alreadyFinished: true },
    ])('reports a failed queue acknowledgment (%j)', async (options) => {
      const { run, rpc, fetch } = setup(name, options)
      const response = await run()
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Internal server error' })
      expect(rpc).toHaveBeenCalledWith('delete', {
        queue_name:
          name === 'process-text-worker' ? 'process_text' : 'validate_quiz',
        message_id: 7,
      })
      if (options.alreadyFinished) expect(fetch).not.toHaveBeenCalled()
    })

    it.each([
      { readError: true },
      { readThrows: true },
      { writeError: true },
      { writeThrows: true },
      { upstreamThrows: true },
      { upstreamFails: true, writeError: true },
    ])(
      'retains unacknowledged work on service/database failure (%j)',
      async (options) => {
        const { run, rpc, fetch } = setup(name, options)
        expect((await run()).status).toBe(500)
        expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
        if ('readError' in options || 'readThrows' in options)
          expect(fetch).not.toHaveBeenCalled()
      }
    )

    it('acknowledges a genuinely missing row without an upstream request', async () => {
      const { run, rpc, fetch } = setup(name, { missing: true })
      expect((await run()).status).toBe(404)
      expect(rpc).toHaveBeenCalledWith('delete', {
        queue_name:
          name === 'process-text-worker' ? 'process_text' : 'validate_quiz',
        message_id: 7,
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('acknowledges a terminal upstream failure after its retry state is persisted', async () => {
      const { run, rpc } = setup(name, { upstreamFails: true })
      expect((await run()).status).toBe(500)
      expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
    })

    if (name === 'validate-quiz-worker') {
      it('retains an invalid-quiz job if its admin-review metadata cannot be persisted', async () => {
        const { run, rpc } = setup(name, { rejectionError: true })
        expect((await run()).status).toBe(500)
        expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
      })
    }
  }
)

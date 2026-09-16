import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

type TextRow = Record<string, unknown>

function setup(
  worker: 'process-text-worker' | 'validate-quiz-worker',
  options: {
    editDuringFetch?: TextRow
    upstreamFails?: boolean
    failFirstWrite?: boolean
    editBeforeSecondWrite?: TextRow
    adminDecision?: string | null
  } = {}
) {
  const row: Record<string, unknown> = {
    id: 'text-1',
    content: 'Original content',
    title: 'Original title',
    fiction: false,
    admin_decision:
      options.adminDecision === undefined ? 'approved' : options.adminDecision,
    owner_id: 'user-1',
    sectional: false,
    section_content: null,
    processing_status:
      worker === 'process-text-worker' ? 'pending' : 'completed',
    quiz: {
      questionSets: [{ questions: [{ question: 'Original question' }] }],
    },
    quiz_valid: null,
    summary: 'Original summary',
    worker_revision: 'revision-1',
  }
  let writes = 0
  const edit = (values: TextRow) => {
    Object.assign(row, values)
    row.worker_revision = `${row.worker_revision}-edited`
  }
  const notifications: unknown[] = []
  const from = () => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    let values: Record<string, unknown> | undefined
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value)
        return query
      },
      neq: (column: string, value: unknown) => {
        filters.push((row) => row[column] !== value)
        return query
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value)
        return query
      },
      maybeSingle: async () => ({ data: structuredClone(row), error: null }),
      update: (value: Record<string, unknown>) => {
        values = value
        return query
      },
      insert: async (value: unknown) => {
        notifications.push(value)
        return { error: null }
      },
      then: (resolve: (value: unknown) => unknown) => {
        writes++
        if (writes === 1 && options.failFirstWrite) {
          edit({ content: 'Edited after failed write' })
          return Promise.resolve({
            error: { message: 'Write unavailable' },
            count: null,
          }).then(resolve)
        }
        if (writes === 2 && options.editBeforeSecondWrite)
          edit(options.editBeforeSecondWrite)
        const matches = filters.every((filter) => filter(row))
        if (matches) {
          Object.assign(row, values)
          row.worker_revision = `${row.worker_revision}-updated`
        }
        return Promise.resolve({
          error: null,
          count: matches ? 1 : 0,
          data: matches ? [{ worker_revision: row.worker_revision }] : [],
        }).then(resolve)
      },
    }
    return query
  }
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === 'read' ? [{ msg_id: 1, message: { text_id: 'text-1' } }] : null,
    error: null,
  }))
  const fetch = vi.fn(async () => {
    if (options.editDuringFetch) edit(options.editDuringFetch)
    if (options.upstreamFails)
      return Response.json({ error: 'Unavailable' }, { status: 503 })
    if (worker === 'process-text-worker') {
      return Response.json({
        title: 'Original generated title',
        questionSets: [
          { questions: [{ question: 'Question about original content' }] },
        ],
        fiction: false,
        summary: 'Summary of original content',
      })
    }
    return Response.json({ isValid: false })
  })
  const handler = loadEdgeFunction(worker, {
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
  return { run, row, fetch, rpc, notifications }
}

describe('worker revision race reproductions', () => {
  it('does not attach old processing results to newly edited pending content', async () => {
    const { run, row, rpc } = setup('process-text-worker', {
      editDuringFetch: {
        content: 'Revised content',
        title: 'Revised title',
        quiz: null,
        summary: null,
      },
    })
    expect((await run()).status).toBe(200)
    expect(row.content).toBe('Revised content')
    expect(row.processing_status).toBe('pending')
    expect(row.summary).toBeNull()
    expect(row.title).toBe('Revised title')
    expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
  })

  it('does not overwrite a quiz corrected during an in-flight validation', async () => {
    const { run, row, fetch, rpc } = setup('validate-quiz-worker', {
      editDuringFetch: {
        quiz: {
          questionSets: [{ questions: [{ question: 'Corrected question' }] }],
        },
        quiz_valid: true,
      },
    })
    expect((await run()).status).toBe(200)
    expect(row.quiz_valid).toBe(true)
    expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
    expect((await run()).status).toBe(200)
    expect(fetch).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
  })

  it.each(['process-text-worker', 'validate-quiz-worker'] as const)(
    'preserves sectional edits with unchanged top-level content (%s)',
    async (worker) => {
      const sections = [
        { title: 'Revised section', content: 'New section body' },
      ]
      const { run, row, rpc } = setup(worker, {
        editDuringFetch: { section_content: sections },
      })
      expect((await run()).status).toBe(200)
      expect(row.section_content).toEqual(sections)
      expect(row.quiz_valid).toBeNull()
      expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
    }
  )

  it.each(['process-text-worker', 'validate-quiz-worker'] as const)(
    'does not mark a newer text failed when an old upstream request fails (%s)',
    async (worker) => {
      const { run, row, rpc, notifications } = setup(worker, {
        editDuringFetch: { content: 'Revised content' },
        upstreamFails: true,
      })
      expect((await run()).status).toBe(200)
      expect(row.quiz_valid).toBeNull()
      expect(row.processing_status).toBe(
        worker === 'process-text-worker' ? 'pending' : 'completed'
      )
      expect(notifications).toEqual([])
      expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
    }
  )

  it('does not apply validation to a newly regenerated quiz with the same completed status', async () => {
    const quiz = {
      questionSets: [{ questions: [{ question: 'New generated question' }] }],
    }
    const { run, row, rpc } = setup('validate-quiz-worker', {
      editDuringFetch: { quiz, quiz_valid: null },
    })
    expect((await run()).status).toBe(200)
    expect(row.quiz).toEqual(quiz)
    expect(row.quiz_valid).toBeNull()
    expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
  })

  it('does not overwrite a newer pending edit in the processing write-error fallback', async () => {
    const { run, row, rpc } = setup('process-text-worker', {
      failFirstWrite: true,
    })
    expect((await run()).status).toBe(500)
    expect(row.processing_status).toBe('pending')
    expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
  })

  it('uses the returned revision to record invalid-quiz review metadata', async () => {
    const { run, row, rpc } = setup('validate-quiz-worker', {
      adminDecision: null,
    })
    expect((await run()).status).toBe(200)
    expect(row.quiz_valid).toBe(false)
    expect(row.admin_decision).toBe('pending')
    expect(row.rejection_stage).toBe('validate_quiz')
    expect(rpc).toHaveBeenCalledWith('delete', expect.anything())
  })

  it('preserves an admin approval between validation and review metadata writes', async () => {
    const { run, row, rpc } = setup('validate-quiz-worker', {
      adminDecision: 'pending',
      editBeforeSecondWrite: { admin_decision: 'approved' },
    })
    expect((await run()).status).toBe(200)
    expect(row.admin_decision).toBe('approved')
    expect(row.rejection_stage).toBeUndefined()
    expect(rpc).not.toHaveBeenCalledWith('delete', expect.anything())
  })
})

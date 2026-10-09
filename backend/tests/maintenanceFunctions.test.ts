import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

type FunctionName = 'populate-quizzes' | 'populate-summaries'
type Row = Record<string, unknown>

const question = {
  question: 'What is the topic?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 0,
}
const validQuiz = {
  questionSets: [{ questions: Array.from({ length: 5 }, () => question) }],
}

function setup(
  name: FunctionName,
  options: {
    row?: Row
    output?: unknown
    editDuringGeneration?: Row
    fetchError?: boolean
    updateError?: boolean
  } = {}
) {
  const row: Row = {
    id: 'text-1',
    title: 'Example',
    content: 'Original content '.repeat(10),
    fiction: false,
    sectional: false,
    quiz: null,
    summary: null,
    worker_revision: 'revision-1',
    ...options.row,
  }
  const writes: Row[] = []
  const from = vi.fn(() => {
    let values: Row | undefined
    const filters: Array<(row: Row) => boolean> = []
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters.push((row) => row[key] === value)
        return query
      },
      is: (key: string, value: unknown) => {
        filters.push((row) => row[key] === value)
        return query
      },
      order: async () => ({
        data: filters.every((filter) => filter(row))
          ? [structuredClone(row)]
          : [],
        error: options.fetchError ? { message: 'Fetch unavailable' } : null,
      }),
      update: (payload: Row) => {
        values = payload
        return query
      },
      then: (resolve: (result: unknown) => unknown) => {
        if (options.updateError) {
          return Promise.resolve({
            data: null,
            error: { message: 'Update unavailable' },
          }).then(resolve)
        }
        const matches = filters.every((filter) => filter(row))
        if (matches && values) {
          writes.push(values)
          Object.assign(row, values)
        }
        return Promise.resolve({
          data: matches ? [{ id: row.id }] : [],
          error: null,
        }).then(resolve)
      },
    }
    return query
  })
  const complete = vi.fn<
    (request: { messages: Array<{ content: string }> }) => Promise<{
      choices: Array<{ message: { content: string } }>
    }>
  >(async () => {
    if (options.editDuringGeneration) {
      Object.assign(row, options.editDuringGeneration)
      row.worker_revision = 'revision-2'
    }
    const output =
      options.output === undefined
        ? name === 'populate-quizzes'
          ? validQuiz
          : { summary: 'Generated summary' }
        : options.output
    return { choices: [{ message: { content: JSON.stringify(output) } }] }
  })
  const handler = loadEdgeFunction(name, {
    modules: {
      'npm:groq-sdk@0.5.0': class {
        chat = { completions: { create: complete } }
      },
      'jsr:@supabase/supabase-js@2': { createClient: () => ({ from }) },
    },
    setTimeout: (callback) => callback(),
  })
  const run = (token = 'test-service-key', method = 'POST') =>
    handler(
      new Request('http://edge.invalid', {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    )
  return { run, row, writes, from, complete }
}

describe.each(['populate-quizzes', 'populate-summaries'] as const)(
  '%s maintenance handler',
  (name) => {
    it.each(['', 'user-token'])(
      'rejects untrusted callers before database or provider activity (%s)',
      async (token) => {
        const { run, from, complete } = setup(name)
        expect((await run(token)).status).toBe(401)
        expect(from).not.toHaveBeenCalled()
        expect(complete).not.toHaveBeenCalled()
      }
    )

    it('preserves CORS preflight and rejects non-POST methods', async () => {
      const { run, from, complete } = setup(name)
      expect((await run('', 'OPTIONS')).status).toBe(200)
      expect((await run('', 'GET')).status).toBe(405)
      expect(from).not.toHaveBeenCalled()
      expect(complete).not.toHaveBeenCalled()
    })

    it('preserves literal dollar patterns in the provider prompt', async () => {
      const content = "Literal $& $` $' source ".repeat(10)
      const { run, complete, writes } = setup(name, { row: { content } })
      expect((await run()).status).toBe(200)
      expect(complete).toHaveBeenCalledOnce()
      expect(complete.mock.calls[0][0].messages[1].content).toContain(
        content.trim()
      )
      expect(writes).toHaveLength(1)
    })

    it('preserves edits made while generation was in flight', async () => {
      const field = name === 'populate-quizzes' ? 'quiz' : 'summary'
      const manualValue =
        field === 'quiz'
          ? { questionSets: [{ manual: true }] }
          : 'Manual summary'
      const { run, row, writes } = setup(name, {
        editDuringGeneration: {
          content: 'Edited source',
          [field]: manualValue,
        },
      })
      const response = await run()
      expect(response.status).toBe(200)
      expect(row.content).toBe('Edited source')
      expect(row[field]).toEqual(manualValue)
      expect(writes).toEqual([])
      expect((await response.json()).results).toMatchObject({
        success: 0,
        skipped: 1,
        failed: 0,
      })
    })

    it('does not attach old output to edited source while the target stays null', async () => {
      const field = name === 'populate-quizzes' ? 'quiz' : 'summary'
      const { run, row, writes } = setup(name, {
        editDuringGeneration: { content: 'Edited source' },
      })
      const response = await run()
      expect(response.status).toBe(200)
      expect(row.content).toBe('Edited source')
      expect(row[field]).toBeNull()
      expect(writes).toEqual([])
      expect((await response.json()).results).toMatchObject({
        success: 0,
        skipped: 1,
      })
    })

    it('skips sectional texts explicitly without provider activity', async () => {
      const { run, complete, writes } = setup(name, {
        row: { sectional: true },
      })
      const response = await run()
      expect(response.status).toBe(200)
      const { results } = await response.json()
      expect(results).toMatchObject({ processed: 1, skipped: 1, success: 0 })
      expect(results.details[0].status).toContain('sectional')
      expect(complete).not.toHaveBeenCalled()
      expect(writes).toEqual([])
    })

    it('returns a database fetch failure before provider activity', async () => {
      const { run, complete } = setup(name, { fetchError: true })
      expect((await run()).status).toBe(500)
      expect(complete).not.toHaveBeenCalled()
    })

    it('reports failed writes without claiming success', async () => {
      const { run, writes } = setup(name, { updateError: true })
      const response = await run()
      expect(response.status).toBe(200)
      expect((await response.json()).results).toMatchObject({
        success: 0,
        failed: 1,
      })
      expect(writes).toEqual([])
    })
  }
)

describe('populate-quizzes supported content and model validation', () => {
  it('accepts the full 4000-character source', async () => {
    const content = 'x'.repeat(4_000)
    const { run, complete, writes } = setup('populate-quizzes', {
      row: { content },
    })
    expect((await run()).status).toBe(200)
    expect(complete.mock.calls[0][0].messages[1].content).toContain(content)
    expect(writes).toEqual([{ quiz: validQuiz }])
  })

  it('reports source longer than 4000 as skipped without processing a prefix', async () => {
    const { run, complete, writes } = setup('populate-quizzes', {
      row: { content: 'x'.repeat(4_001) },
    })
    const response = await run()
    expect(response.status).toBe(200)
    const { results } = await response.json()
    expect(results).toMatchObject({ processed: 1, skipped: 1, success: 0 })
    expect(results.details[0].status).toContain('4000')
    expect(complete).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })

  it.each([
    { question: '   ' },
    { options: ['A', 'B', 'C', '   '] },
    { correctAnswer: 0.5 },
    { correctAnswer: 4 },
    null,
  ])('rejects malformed quiz questions (%j)', async (override) => {
    const invalidQuestion = override ? { ...question, ...override } : null
    const { run, writes } = setup('populate-quizzes', {
      output: {
        questionSets: [
          { questions: Array.from({ length: 5 }, () => invalidQuestion) },
        ],
      },
    })
    const response = await run()
    expect(response.status).toBe(200)
    expect((await response.json()).results).toMatchObject({
      success: 0,
      failed: 1,
    })
    expect(writes).toEqual([])
  })
})

describe('populate-summaries supported content and model validation', () => {
  it('accepts the full 15000-character source', async () => {
    const content = 'x'.repeat(15_000)
    const { run, complete, writes } = setup('populate-summaries', {
      row: { content },
    })
    expect((await run()).status).toBe(200)
    expect(complete.mock.calls[0][0].messages[1].content).toContain(content)
    expect(writes).toEqual([{ summary: 'Generated summary' }])
  })

  it('rejects a whitespace-only generated summary', async () => {
    const { run, writes } = setup('populate-summaries', {
      output: { summary: '   ' },
    })
    const response = await run()
    expect(response.status).toBe(200)
    expect((await response.json()).results).toMatchObject({
      success: 0,
      failed: 1,
    })
    expect(writes).toEqual([])
  })

  it('reports source longer than 15000 as skipped instead of summarizing a prefix', async () => {
    const { run, complete, writes } = setup('populate-summaries', {
      row: { content: 'x'.repeat(15_001) },
    })
    const response = await run()
    expect(response.status).toBe(200)
    expect((await response.json()).results).toMatchObject({
      skipped: 1,
      success: 0,
    })
    expect(complete).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })
})

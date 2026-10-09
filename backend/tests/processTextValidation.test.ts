import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

const makeQuestion = (overrides: Record<string, unknown> = {}) => ({
  question: 'What is the main topic?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 0,
  ...overrides,
})

const makeSet = (
  questions: unknown[] = Array.from({ length: 5 }, () => makeQuestion())
) => ({ questions })

const makeSuccess = (overrides: Record<string, unknown> = {}) => ({
  status: 'success',
  title: 'Test Title',
  questionSets: [makeSet()],
  fiction: false,
  summary: 'A valid summary for a non-fiction text.',
  ...overrides,
})

async function processOutput(
  output: unknown,
  input: Record<string, unknown> = {}
) {
  const complete = vi.fn().mockResolvedValue({
    choices: [
      { finish_reason: 'stop', message: { content: JSON.stringify(output) } },
    ],
  })
  const handler = loadEdgeFunction('process-text', {
    modules: {
      'npm:groq-sdk@0.37.0': class {
        chat = { completions: { create: complete } }
      },
    },
  })
  const response = await handler(
    new Request('http://edge.invalid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-service-key',
      },
      body: JSON.stringify({ content: 'Example text', ...input }),
    })
  )
  return { response, complete }
}

describe('process-text model response validation', () => {
  it.each([
    {
      name: 'non-fiction',
      output: makeSuccess(),
      summary: 'A valid summary for a non-fiction text.',
    },
    {
      name: 'fiction without a summary',
      output: makeSuccess({ fiction: true, summary: null }),
      summary: null,
    },
    {
      name: 'fiction with a model-supplied summary',
      output: makeSuccess({
        fiction: true,
        summary: 'Ignored fiction summary',
      }),
      summary: null,
    },
    {
      name: 'a null title',
      output: makeSuccess({ title: null }),
      summary: 'A valid summary for a non-fiction text.',
    },
    {
      name: 'five question sets',
      output: makeSuccess({
        questionSets: Array.from({ length: 5 }, () => makeSet()),
      }),
      summary: 'A valid summary for a non-fiction text.',
    },
    {
      name: 'seven questions',
      output: makeSuccess({
        questionSets: [
          makeSet(Array.from({ length: 7 }, () => makeQuestion())),
        ],
      }),
      summary: 'A valid summary for a non-fiction text.',
    },
  ])('returns usable reading data for $name', async ({ output, summary }) => {
    const { response, complete } = await processOutput(output)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      title: output.title,
      questionSets: output.questionSets,
      fiction: output.fiction,
      summary,
    })
    expect(complete).toHaveBeenCalledOnce()
  })

  it.each([
    { name: 'null', output: null },
    { name: 'a string', output: 'unexpected' },
    { name: 'an empty object', output: {} },
    {
      name: 'missing question sets',
      output: makeSuccess({ questionSets: undefined }),
    },
    {
      name: 'missing fiction classification',
      output: makeSuccess({ fiction: undefined }),
    },
    {
      name: 'an invalid status',
      output: makeSuccess({ status: 'unexpected' }),
    },
    { name: 'a numeric title', output: makeSuccess({ title: 123 }) },
    { name: 'missing title', output: makeSuccess({ title: undefined }) },
    {
      name: 'non-array question sets',
      output: makeSuccess({ questionSets: 'invalid' }),
    },
    { name: 'zero question sets', output: makeSuccess({ questionSets: [] }) },
    {
      name: 'six question sets',
      output: makeSuccess({
        questionSets: Array.from({ length: 6 }, () => makeSet()),
      }),
    },
    {
      name: 'a null question set',
      output: makeSuccess({ questionSets: [null] }),
    },
    {
      name: 'non-array questions',
      output: makeSuccess({ questionSets: [{ questions: 'invalid' }] }),
    },
    {
      name: 'four questions',
      output: makeSuccess({
        questionSets: [
          makeSet(Array.from({ length: 4 }, () => makeQuestion())),
        ],
      }),
    },
    {
      name: 'eight questions',
      output: makeSuccess({
        questionSets: [
          makeSet(Array.from({ length: 8 }, () => makeQuestion())),
        ],
      }),
    },
    {
      name: 'a string fiction flag',
      output: makeSuccess({ fiction: 'false' }),
    },
    {
      name: 'non-fiction without a summary',
      output: makeSuccess({ summary: null }),
    },
    {
      name: 'non-fiction with an empty summary',
      output: makeSuccess({ summary: '' }),
    },
    {
      name: 'non-fiction with a blank summary',
      output: makeSuccess({ summary: '   ' }),
    },
  ])('rejects $name after the bounded retry budget', async ({ output }) => {
    const { response, complete } = await processOutput(output)
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: 'Failed to process text',
      code: 'invalid_llm_output',
      reason: 'Response does not match expected format',
    })
    expect(complete).toHaveBeenCalledTimes(3)
  })

  it.each([
    { name: 'a null question', question: null },
    {
      name: 'non-string question text',
      question: makeQuestion({ question: 123 }),
    },
    { name: 'empty question text', question: makeQuestion({ question: '' }) },
    {
      name: 'blank question text',
      question: makeQuestion({ question: '   ' }),
    },
    {
      name: 'non-array options',
      question: makeQuestion({ options: 'invalid' }),
    },
    { name: 'zero options', question: makeQuestion({ options: [] }) },
    {
      name: 'three options',
      question: makeQuestion({ options: ['A', 'B', 'C'] }),
    },
    {
      name: 'five options',
      question: makeQuestion({ options: ['A', 'B', 'C', 'D', 'E'] }),
    },
    {
      name: 'a numeric option',
      question: makeQuestion({ options: ['A', 'B', 'C', 42] }),
    },
    {
      name: 'an empty option',
      question: makeQuestion({ options: ['A', '', 'C', 'D'] }),
    },
    {
      name: 'a blank option',
      question: makeQuestion({ options: ['A', 'B', '  ', 'D'] }),
    },
    {
      name: 'a negative answer index',
      question: makeQuestion({ correctAnswer: -1 }),
    },
    {
      name: 'an answer past the final option',
      question: makeQuestion({ correctAnswer: 4 }),
    },
    {
      name: 'a fractional answer index',
      question: makeQuestion({ correctAnswer: 1.5 }),
    },
    {
      name: 'a non-finite answer index',
      question: makeQuestion({ correctAnswer: NaN }),
    },
    {
      name: 'a string answer index',
      question: makeQuestion({ correctAnswer: '2' }),
    },
  ])('rejects $name from the real handler', async ({ question }) => {
    const output = makeSuccess({
      questionSets: [
        makeSet([question, ...Array.from({ length: 4 }, () => makeQuestion())]),
      ],
    })
    const { response, complete } = await processOutput(output)
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'invalid_llm_output' })
    expect(complete).toHaveBeenCalledTimes(3)
  })

  it.each([0, 3])(
    'accepts answer index %i at an option boundary',
    async (correctAnswer) => {
      const output = makeSuccess({
        questionSets: [
          makeSet(
            Array.from({ length: 5 }, () => makeQuestion({ correctAnswer }))
          ),
        ],
      })
      const { response } = await processOutput(output)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        questionSets: output.questionSets,
      })
    }
  )

  it('returns a content-policy rejection without retrying a complete moderation decision', async () => {
    const { response, complete } = await processOutput({
      status: 'error',
      error: 'Content violates the policy',
      violation_type: 'hate_speech',
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Content violates the policy',
      violation_type: 'hate_speech',
    })
    expect(complete).toHaveBeenCalledOnce()
  })

  it.each([
    { error: 123, violation_type: 'policy' },
    { error: 'Rejected', violation_type: null },
    { violation_type: 'policy' },
    { error: null, violation_type: null },
  ])('fails closed after incomplete moderation output (%j)', async (fields) => {
    const { response, complete } = await processOutput({
      status: 'error',
      ...fields,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Content flagged but details unavailable',
      violation_type: 'unknown',
    })
    expect(complete).toHaveBeenCalledTimes(3)
  })

  it('preserves one question set per section with the sectional question minimum', async () => {
    const output = makeSuccess({
      questionSets: Array.from({ length: 10 }, () =>
        makeSet(Array.from({ length: 3 }, () => makeQuestion()))
      ),
      summary: null,
    })
    const { response } = await processOutput(output, {
      sectional: true,
      section_content: Array.from({ length: 10 }, (_, index) => ({
        title: `Section ${index + 1}`,
        content: 'Example section content',
      })),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      title: 'Test Title',
      questionSets: output.questionSets,
      fiction: false,
      summary: null,
    })
  })

  it('rejects a generated sectional quiz that omits a section', async () => {
    const { response, complete } = await processOutput(makeSuccess(), {
      sectional: true,
      section_content: [
        { title: 'First', content: 'First content' },
        { title: 'Second', content: 'Second content' },
      ],
    })
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'invalid_llm_output' })
    expect(complete).toHaveBeenCalledTimes(3)
  })
})

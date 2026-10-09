import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

describe.each(['process-text', 'validate-quiz'])(
  '%s HTTP validation',
  (name) => {
    function setup() {
      const complete = vi.fn()
      const handler = loadEdgeFunction(name, {
        modules: {
          'npm:groq-sdk@0.37.0': class {
            chat = { completions: { create: complete } }
          },
        },
      })
      const post = (body: unknown, token = 'test-service-key') =>
        handler(
          new Request('http://edge.invalid', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
          })
        )
      return { post, complete, handler }
    }

    it.each([{ body: null }, { body: [] }, { body: 'text' }, { body: 123 }])(
      'returns 400 for a non-object JSON body (%j)',
      async ({ body }) => {
        const { post, complete } = setup()
        const response = await post(body)
        expect(response.status).toBe(400)
        expect(complete).not.toHaveBeenCalled()
      }
    )

    if (name === 'process-text') {
      it.each(['', 'user-token'])(
        'rejects an untrusted caller before spending Groq credits (%s)',
        async (token) => {
          const { post, complete } = setup()
          const response = await post({ content: 'Example' }, token)
          expect(response.status).toBe(401)
          expect(await response.json()).toEqual({ error: 'Unauthorized' })
          expect(complete).not.toHaveBeenCalled()
        }
      )

      it('preserves anonymous CORS preflight without spending Groq credits', async () => {
        const { handler, complete } = setup()
        const response = await handler(
          new Request('http://edge.invalid', {
            method: 'OPTIONS',
          })
        )
        expect(response.status).toBe(200)
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
        expect(complete).not.toHaveBeenCalled()
      })

      const validOutput = {
        status: 'success',
        title: 'Example',
        questionSets: [
          {
            questions: Array.from({ length: 5 }, () => ({
              question: 'What is the topic?',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
            })),
          },
        ],
        fiction: false,
        summary: 'Example summary',
      }
      const validCompletion = {
        choices: [
          {
            finish_reason: 'stop',
            message: { content: JSON.stringify(validOutput) },
          },
        ],
      }

      it.each([
        { sectional: false, skipContentCheck: false },
        { sectional: false, skipContentCheck: true },
        { sectional: true, skipContentCheck: false },
        { sectional: true, skipContentCheck: true },
      ])(
        'preserves literal dollar patterns in source text (%j)',
        async (flags) => {
          const { post, complete } = setup()
          complete.mockResolvedValue(validCompletion)
          const content = "Literal $& $` $' source text"
          const response = await post({
            content,
            ...flags,
            section_content: [{ title: 'Example', content }],
          })
          expect(response.status).toBe(200)
          expect(complete.mock.calls[0][0].messages[1].content).toContain(
            content
          )
        }
      )

      it('retries a malformed model question and returns the next valid output', async () => {
        const { post, complete } = setup()
        const invalidOutput = structuredClone(validOutput)
        invalidOutput.questionSets[0].questions[0] =
          null as unknown as (typeof invalidOutput.questionSets)[0]['questions'][0]
        complete
          .mockResolvedValueOnce({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: JSON.stringify(invalidOutput) },
              },
            ],
          })
          .mockResolvedValueOnce({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: JSON.stringify(validOutput) },
              },
            ],
          })
        const response = await post({ content: 'Example' })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
          title: 'Example',
          questionSets: validOutput.questionSets,
          fiction: false,
          summary: 'Example summary',
        })
        expect(complete).toHaveBeenCalledTimes(2)
      })

      it('rejects oversized content before moderating only a prefix', async () => {
        const { post, complete } = setup()
        complete.mockResolvedValue(validCompletion)
        const response = await post({ content: 'x'.repeat(8_001) })
        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({
          error: 'Content cannot exceed 8000 characters',
        })
        expect(complete).not.toHaveBeenCalled()
      })

      it('accepts 8000 sectional characters plus form separators', async () => {
        const { post, complete } = setup()
        const sections = [
          { title: 'First', content: 'a'.repeat(4_000) },
          { title: 'Second', content: 'b'.repeat(4_000) },
        ]
        complete.mockResolvedValue({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  ...validOutput,
                  questionSets: [
                    validOutput.questionSets[0],
                    validOutput.questionSets[0],
                  ],
                  summary: null,
                }),
              },
            },
          ],
        })
        const response = await post({
          content: sections
            .map((section) => section.content)
            .join('\n\n---\n\n'),
          sectional: true,
          section_content: sections,
        })
        expect(response.status).toBe(200)
        expect(complete).toHaveBeenCalledOnce()
        const prompt = complete.mock.calls[0][0].messages[1].content
        expect(prompt).toContain(sections[0].content)
        expect(prompt).toContain(sections[1].content)
      })

      it('rejects a sum of 8001 sectional characters before calling Groq', async () => {
        const { post, complete } = setup()
        const sections = [
          { title: 'First', content: 'a'.repeat(4_000) },
          { title: 'Second', content: 'b'.repeat(4_001) },
        ]
        const response = await post({
          content: sections
            .map((section) => section.content)
            .join('\n\n---\n\n'),
          sectional: true,
          section_content: sections,
        })
        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({
          error: 'Sectional content cannot exceed 8000 characters in total',
        })
        expect(complete).not.toHaveBeenCalled()
      })

      it.each([
        { title: 'x'.repeat(101), content: 'Example' },
        { title: '   ', content: 'Example' },
        { title: 'Example', content: '   ' },
      ])('rejects invalid section text (%j)', async (section) => {
        const { post, complete } = setup()
        complete.mockResolvedValue(validCompletion)
        const response = await post({
          content: 'Example',
          sectional: true,
          section_content: [section],
        })
        expect(response.status).toBe(400)
        expect(complete).not.toHaveBeenCalled()
      })

      it('rejects a non-boolean sectional flag', async () => {
        const { post, complete } = setup()
        complete.mockResolvedValue(validCompletion)
        const response = await post({
          content: 'Example',
          sectional: 'true',
          section_content: [{ title: 'Example', content: 'Example' }],
        })
        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({
          error: 'sectional and generateTitle must be booleans',
        })
        expect(complete).not.toHaveBeenCalled()
      })

      it('rejects null section entries without calling Groq', async () => {
        const { post, complete } = setup()
        const response = await post({
          content: 'Example',
          sectional: true,
          section_content: [null],
        })
        expect(response.status).toBe(400)
        expect(complete).not.toHaveBeenCalled()
      })
    } else {
      it('preserves literal dollar patterns in validation content, quiz, and summary', async () => {
        const { post, complete } = setup()
        complete.mockResolvedValue({
          choices: [
            { finish_reason: 'stop', message: { content: '{"isValid":true}' } },
          ],
        })
        const content =
          "Content $& $` $' {summary_section} {quiz_sample} literal"
        const question = "Question $& $` $' {summary_section} literal"
        const summary = "Summary $& $` $' {quiz_sample} literal"
        const response = await post({
          content,
          quiz: { questionSets: [{ questions: [{ question }] }] },
          summary,
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ isValid: true })
        const prompt = complete.mock.calls[0][0].messages[1].content
        expect(prompt).toContain(content)
        expect(prompt).toContain(question)
        expect(prompt).toContain(summary)
      })

      it('preserves successful quiz validation for a valid service request', async () => {
        const { post, complete } = setup()
        complete.mockResolvedValue({
          choices: [
            { finish_reason: 'stop', message: { content: '{"isValid":true}' } },
          ],
        })
        const response = await post({
          content: 'Example',
          quiz: { questionSets: [{ questions: [{ question: 'Example?' }] }] },
          summary: 'Example summary',
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ isValid: true })
        expect(complete).toHaveBeenCalledOnce()
      })

      it.each([
        { questions: [] },
        { questions: {} },
        { questions: 'not an array' },
      ])('rejects invalid question arrays (%j)', async ({ questions }) => {
        const { post, complete } = setup()
        const response = await post({
          content: 'Example',
          quiz: { questionSets: [{ questions }] },
        })
        expect(response.status).toBe(400)
        expect(complete).not.toHaveBeenCalled()
      })

      it('rejects a non-string summary without calling Groq', async () => {
        const { post, complete } = setup()
        const response = await post({
          content: 'Example',
          quiz: { questionSets: [{ questions: [{ question: 'Example?' }] }] },
          summary: 12,
        })
        expect(response.status).toBe(400)
        expect(complete).not.toHaveBeenCalled()
      })

      it('keeps quiz validation restricted to service-role requests', async () => {
        const { post, complete } = setup()
        const response = await post({ content: 'Example' }, 'user-token')
        expect(response.status).toBe(401)
        expect(complete).not.toHaveBeenCalled()
      })
    }
  }
)

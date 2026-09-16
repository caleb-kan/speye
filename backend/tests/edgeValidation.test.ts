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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          })
        )
      return { post, complete }
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

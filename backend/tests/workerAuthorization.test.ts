import { describe, expect, it, vi } from 'vitest'
import { loadEdgeFunction } from './helpers/edgeFunction'

const request = (body: unknown, token = 'test-user-token') =>
  new Request('http://edge.invalid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

describe.each(['process-text-worker', 'validate-quiz-worker'])(
  '%s authorization',
  (name) => {
    const workerToken = 'a'.repeat(64)
    const setup = ({
      validToken = true,
      verificationError = false,
      verificationThrows = false,
    } = {}) => {
      const rpc = vi.fn(async (method: string) => {
        if (method === 'verify_worker_token') {
          if (verificationThrows) throw new Error('Unavailable')
          return {
            data: validToken,
            error: verificationError ? { message: 'Unavailable' } : null,
          }
        }
        return { data: [], error: null }
      })
      const handler = loadEdgeFunction(name, {
        modules: {
          'jsr:@supabase/supabase-js@2': {
            createClient: () => ({ rpc }),
          },
        },
      })
      return { handler, rpc }
    }

    it.each(['', 'test-user-token', 'wrong-service-key'])(
      'rejects an untrusted caller before touching the queue (%s)',
      async (token) => {
        const { handler, rpc } = setup()
        const response = await handler(request({}, token))
        expect(response.status).toBe(401)
        expect(rpc).not.toHaveBeenCalled()
      }
    )

    it('allows a service-role POST to check the queue', async () => {
      const { handler, rpc } = setup()
      const response = await handler(request({}, 'test-service-key'))
      expect(response.status).toBe(200)
      expect(rpc).toHaveBeenCalledWith('read', {
        queue_name:
          name === 'process-text-worker' ? 'process_text' : 'validate_quiz',
        sleep_seconds: 300,
        n: 1,
      })
      expect(rpc).not.toHaveBeenCalledWith(
        'verify_worker_token',
        expect.anything()
      )
    })

    it('verifies the Vault credential before reading the queue', async () => {
      const { handler, rpc } = setup()
      const req = request({}, '')
      req.headers.set('X-Worker-Token', workerToken)
      expect((await handler(req)).status).toBe(200)
      expect(rpc.mock.calls.map(([method]) => method)).toEqual([
        'verify_worker_token',
        'read',
      ])
      expect(rpc).toHaveBeenCalledWith('verify_worker_token', {
        p_token: workerToken,
      })
    })

    it.each(['short', 'g'.repeat(64), 'a'.repeat(65)])(
      'rejects a malformed cron token without database work (%s)',
      async (token) => {
        const { handler, rpc } = setup()
        const req = request({}, '')
        req.headers.set('X-Worker-Token', token)
        expect((await handler(req)).status).toBe(401)
        expect(rpc).not.toHaveBeenCalled()
      }
    )

    it.each([
      { validToken: false, status: 401 },
      { verificationError: true, status: 503 },
      { verificationThrows: true, status: 503 },
    ])(
      'fails closed before queue access when verification fails (%j)',
      async ({ status, ...options }) => {
        const { handler, rpc } = setup(options)
        const req = request({}, '')
        req.headers.set('X-Worker-Token', workerToken)
        expect((await handler(req)).status).toBe(status)
        expect(rpc.mock.calls.map(([method]) => method)).toEqual([
          'verify_worker_token',
        ])
      }
    )

    it('rejects methods that must not consume jobs', async () => {
      const { handler, rpc } = setup()
      const response = await handler(
        new Request('http://edge.invalid', {
          headers: { Authorization: 'Bearer test-service-key' },
        })
      )
      expect(response.status).toBe(405)
      expect(rpc).not.toHaveBeenCalled()
    })
  }
)

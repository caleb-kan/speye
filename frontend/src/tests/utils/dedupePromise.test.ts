import { describe, it, expect, vi } from 'vitest'
import { dedupePromise } from '../../utils/dedupePromise'

describe('dedupePromise', () => {
  it('returns the same promise to concurrent callers', () => {
    const gate = dedupePromise<string>()
    let resolveInner!: (value: string) => void
    const fn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveInner = resolve
        })
    )

    const a = gate(fn)
    const b = gate(fn)
    const c = gate(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    expect(b).toBe(c)

    resolveInner('done')
  })

  it('resolves all concurrent callers with the same value', async () => {
    const gate = dedupePromise<number>()
    const fn = vi.fn(() => Promise.resolve(42))

    const [a, b, c] = await Promise.all([gate(fn), gate(fn), gate(fn)])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(c).toBe(42)
  })

  it('rejects all concurrent callers with the same reason', async () => {
    const gate = dedupePromise<void>()
    const fn = vi.fn(() => Promise.reject(new Error('boom')))

    const results = await Promise.allSettled([gate(fn), gate(fn), gate(fn)])

    expect(fn).toHaveBeenCalledTimes(1)
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(Error)
        expect((r.reason as Error).message).toBe('boom')
      }
    }
  })

  it('allows a new call after the previous one settles', async () => {
    const gate = dedupePromise<number>()
    const fn = vi.fn(() => Promise.resolve(1))

    await gate(fn)
    await gate(fn)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('allows a new call after the previous one rejects', async () => {
    const gate = dedupePromise<number>()
    let attempt = 0
    const fn = vi.fn(() => {
      attempt += 1
      return attempt === 1
        ? Promise.reject(new Error('fail'))
        : Promise.resolve(2)
    })

    await expect(gate(fn)).rejects.toThrow('fail')
    await expect(gate(fn)).resolves.toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('produces independent gates per dedupePromise() call', async () => {
    const gateA = dedupePromise<number>()
    const gateB = dedupePromise<number>()
    const fnA = vi.fn(() => Promise.resolve(1))
    const fnB = vi.fn(() => Promise.resolve(2))

    await Promise.all([gateA(fnA), gateB(fnB)])

    expect(fnA).toHaveBeenCalledTimes(1)
    expect(fnB).toHaveBeenCalledTimes(1)
  })
})

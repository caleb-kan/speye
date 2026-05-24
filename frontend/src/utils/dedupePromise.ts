/**
 * Creates a "promise gate" that shares a single in-flight promise across
 * concurrent callers. While a promise is pending, every call returns the
 * SAME promise. Once it settles, the next call starts a new one.
 *
 * Use this when an async operation has side effects that must not run
 * twice concurrently — for example, a camera-initialization call that
 * would create a second MediaStream and orphan the first.
 *
 * Each call to `dedupePromise()` produces an independent gate, so module-
 * level operations get module-level dedupe by holding the gate at module
 * scope:
 *
 * ```ts
 * const resumeOnce = dedupePromise<void>()
 * await resumeOnce(() => webgazer.resume())
 * ```
 *
 * Callers should `await` the returned promise. A fire-and-forget caller
 * who then synchronously triggers a second `gate(fn)` call before the
 * `.finally` microtask has flushed will see `pending` still set to the
 * already-settled prior promise and incorrectly share its (stale) result
 * instead of starting a fresh call. Both callers in this codebase await
 * the gate; if you add a new one, do the same.
 */
export function dedupePromise<T>(): (fn: () => Promise<T>) => Promise<T> {
  let pending: Promise<T> | null = null
  return (fn) => {
    if (pending) return pending
    pending = fn().finally(() => {
      pending = null
    })
    return pending
  }
}

import { vi } from 'vitest'

/**
 * jsdom 29 paired with vitest's module mocking can leave `window.localStorage`
 * undefined in tests that call `vi.mock(...)` at the top of the file. Tests
 * that need real-ish persistence call this once at the top level to install a
 * Map-backed Storage stub, and call `reset()` (returned) in `beforeEach`.
 */
export function installMockLocalStorage() {
  const store = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }

  vi.stubGlobal('localStorage', storage)

  return {
    storage,
    reset: () => store.clear(),
  }
}

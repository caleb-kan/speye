import { beforeEach } from 'vitest'
import { STORAGE_KEYS } from '../constants/storage'
import { vi } from 'vitest'

// Clear reading preferences before each test to ensure clean state
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.READING_PREFERENCES)
    } catch {
      // Ignore errors in environments without full localStorage support
    }
  }
})

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

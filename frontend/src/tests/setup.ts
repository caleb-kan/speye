import { beforeEach } from 'vitest'
import { STORAGE_KEYS } from '../constants/storage'

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

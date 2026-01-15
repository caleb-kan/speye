import '@testing-library/jest-dom'
import { vi } from 'vitest'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
}

const globalWithStorage = globalThis as typeof globalThis & { localStorage: Storage }
globalWithStorage.localStorage = localStorageMock as Storage

Element.prototype.scrollTo = vi.fn()
window.scrollTo = vi.fn()

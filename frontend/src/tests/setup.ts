import { beforeEach } from 'vitest'
import { STORAGE_KEYS } from '../constants/storage'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// jsdom 28+ removed the AnimationEvent and TransitionEvent constructors.
// React reads `"AnimationEvent" in window` at module load and, if absent,
// listens for vendor-prefixed events instead of `animationend`, so
// fireEvent.animationEnd no longer reaches onAnimationEnd handlers.
if (typeof window !== 'undefined' && !('AnimationEvent' in window)) {
  class AnimationEventPolyfill extends Event {
    animationName: string
    elapsedTime: number
    pseudoElement: string
    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init)
      this.animationName = init.animationName ?? ''
      this.elapsedTime = init.elapsedTime ?? 0
      this.pseudoElement = init.pseudoElement ?? ''
    }
  }
  ;(
    window as unknown as { AnimationEvent: typeof AnimationEventPolyfill }
  ).AnimationEvent = AnimationEventPolyfill
}
if (typeof window !== 'undefined' && !('TransitionEvent' in window)) {
  class TransitionEventPolyfill extends Event {
    propertyName: string
    elapsedTime: number
    pseudoElement: string
    constructor(type: string, init: TransitionEventInit = {}) {
      super(type, init)
      this.propertyName = init.propertyName ?? ''
      this.elapsedTime = init.elapsedTime ?? 0
      this.pseudoElement = init.pseudoElement ?? ''
    }
  }
  ;(
    window as unknown as { TransitionEvent: typeof TransitionEventPolyfill }
  ).TransitionEvent = TransitionEventPolyfill
}

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

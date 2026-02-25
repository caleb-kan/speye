import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isMobileDevice } from '../../utils/isMobileDevice'

describe('isMobileDevice', () => {
  let originalInnerWidth: number
  let originalInnerHeight: number
  let hadOntouchstart: boolean
  let originalMaxTouchPoints: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    hadOntouchstart = 'ontouchstart' in window
    originalMaxTouchPoints = navigator.maxTouchPoints
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    if (hadOntouchstart) {
      ;(window as unknown as Record<string, unknown>).ontouchstart = null
    } else {
      delete (window as unknown as Record<string, unknown>).ontouchstart
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: originalMaxTouchPoints,
    })
  })

  it('returns true when touch screen and small screen (< 768)', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    expect(isMobileDevice()).toBe(true)
  })

  it('returns false when no touch and large screen (desktop)', () => {
    delete (window as unknown as Record<string, unknown>).ontouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    expect(isMobileDevice()).toBe(false)
  })

  it('returns false when touch screen but large screen (tablet-like)', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    expect(isMobileDevice()).toBe(false)
  })

  it('returns false when small screen but no touch (narrow desktop window)', () => {
    delete (window as unknown as Record<string, unknown>).ontouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    expect(isMobileDevice()).toBe(false)
  })

  it('returns false at exactly 768px width with touch', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })

    expect(isMobileDevice()).toBe(false)
  })

  it('returns true at 767px width with touch', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    })

    expect(isMobileDevice()).toBe(true)
  })

  it('detects touch via navigator.maxTouchPoints > 0', () => {
    delete (window as unknown as Record<string, unknown>).ontouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    expect(isMobileDevice()).toBe(true)
  })

  it('returns true when phone is rotated to landscape (wide but short viewport)', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 844,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 390,
    })

    expect(isMobileDevice()).toBe(true)
  })

  it('returns false for tablet in landscape with both dimensions >= 768', () => {
    ;(window as unknown as Record<string, unknown>).ontouchstart = null
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })

    expect(isMobileDevice()).toBe(false)
  })
})

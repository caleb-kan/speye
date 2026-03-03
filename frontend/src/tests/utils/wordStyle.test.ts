import { describe, it, expect } from 'vitest'
import {
  getWordStyle,
  BACKWARD_VISIBLE_COUNT,
  BACKWARD_BLUR_TRANSITION,
  MAX_BLUR,
  HIGHLIGHT_WIDTH,
} from '../../utils/wordStyle'

describe('getWordStyle', () => {
  describe('current word (distance = 0)', () => {
    it('returns primary color with no blur', () => {
      const style = getWordStyle(0, true)
      expect(style.color).toBe('var(--color-primary)')
      expect(style.opacity).toBe(1)
      expect(style.blur).toBe(0)
    })

    it('never has blur regardless of blurEnabled flag', () => {
      expect(getWordStyle(0, true).blur).toBe(0)
      expect(getWordStyle(0, false).blur).toBe(0)
    })
  })

  describe('already read words (distance < 0)', () => {
    it('keeps recent words visible (no blur) within BACKWARD_VISIBLE_COUNT', () => {
      for (let i = 1; i <= BACKWARD_VISIBLE_COUNT; i++) {
        const style = getWordStyle(-i, true)
        expect(style.blur).toBe(0)
        expect(style.color).toBe('var(--color-text)')
      }
    })

    it('gradually blurs words in the transition zone', () => {
      const transitionStart = BACKWARD_VISIBLE_COUNT + 1
      const style = getWordStyle(-transitionStart, true)

      // First word in transition should have partial blur
      expect(style.blur).toBeGreaterThan(0)
      expect(style.blur).toBeLessThan(MAX_BLUR)
    })

    it('increases blur progressively through transition zone', () => {
      const blurs: number[] = []
      for (let i = 1; i <= BACKWARD_BLUR_TRANSITION; i++) {
        const distance = -(BACKWARD_VISIBLE_COUNT + i)
        const style = getWordStyle(distance, true)
        blurs.push(style.blur)
      }

      // Each word should be more blurred than the previous
      for (let i = 1; i < blurs.length; i++) {
        expect(blurs[i]).toBeGreaterThan(blurs[i - 1])
      }
    })

    it('fully blurs words beyond the transition zone', () => {
      const beyondTransition = -(
        BACKWARD_VISIBLE_COUNT +
        BACKWARD_BLUR_TRANSITION +
        1
      )
      const style = getWordStyle(beyondTransition, true)
      expect(style.blur).toBe(MAX_BLUR)
    })

    it('has no blur when blur is disabled', () => {
      const style = getWordStyle(-10, false)
      expect(style.blur).toBe(0)
    })
  })

  describe('upcoming words (distance > 0)', () => {
    it('uses highlight colors within HIGHLIGHT_WIDTH', () => {
      const style = getWordStyle(1, true)
      expect(style.color).toContain('color-mix')
      expect(style.opacity).toBe(1)
    })

    it('uses secondary color beyond HIGHLIGHT_WIDTH', () => {
      const style = getWordStyle(HIGHLIGHT_WIDTH + 1, true)
      expect(style.color).toBe('var(--color-text-secondary)')
      expect(style.opacity).toBe(0.6)
    })

    it('never has blur regardless of blurEnabled flag', () => {
      expect(getWordStyle(1, true).blur).toBe(0)
      expect(getWordStyle(1, false).blur).toBe(0)
    })
  })
})

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useReadingPositionSync } from '../../hooks/useReadingPositionSync'

const navigation = {
  textId: null as string | null,
  initialPosition: 122,
  modeTimestamp: 1 as number | undefined,
}

describe('useReadingPositionSync', () => {
  it('preserves the navigation position when the initial text finishes loading', () => {
    const { result, rerender } = renderHook(useReadingPositionSync, {
      initialProps: navigation,
    })
    expect(result.current.position).toBe(122)
    rerender({ ...navigation, textId: 'text-a' })
    expect(result.current.position).toBe(122)
  })

  it('resets when a different text is selected after the first text', () => {
    const { result, rerender } = renderHook(useReadingPositionSync, {
      initialProps: navigation,
    })
    rerender({ ...navigation, textId: 'text-a' })
    act(() => result.current.setPosition(140))
    rerender({ ...navigation, textId: 'text-b' })
    expect(result.current.position).toBe(0)
  })

  it.each([
    ['text-a', 140],
    ['text-b', 0],
  ])(
    'tracks the previous text through loading before resolving %s',
    (textId, expected) => {
      const { result, rerender } = renderHook(useReadingPositionSync, {
        initialProps: { ...navigation, textId: 'text-a' as string | null },
      })
      act(() => result.current.setPosition(140))
      rerender({ ...navigation, textId: null })
      rerender({ ...navigation, textId: String(textId) })
      expect(result.current.position).toBe(expected)
    }
  )

  it('restores a new mode navigation position before its text resolves', () => {
    const { result, rerender } = renderHook(useReadingPositionSync, {
      initialProps: { ...navigation, textId: 'text-a' as string | null },
    })
    const nextNavigation = {
      ...navigation,
      initialPosition: 155,
      modeTimestamp: 2,
    }
    rerender(nextNavigation)
    expect(result.current.position).toBe(155)
    rerender({ ...nextNavigation, textId: 'text-a' })
    expect(result.current.position).toBe(155)
  })

  it('preserves an explicit reset while the initial text is loading', () => {
    const { result, rerender } = renderHook(useReadingPositionSync, {
      initialProps: navigation,
    })
    act(() => result.current.resetPosition())
    rerender({ ...navigation, textId: 'text-a' })
    expect(result.current.position).toBe(0)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useArrowNavigation } from '../../hooks/useArrowNavigation'

function dispatchArrowKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useArrowNavigation', () => {
  it('calls onBack on ArrowLeft', () => {
    const onBack = vi.fn()
    renderHook(() =>
      useArrowNavigation({ enabled: true, onBack, onForward: vi.fn() })
    )

    dispatchArrowKey('ArrowLeft')

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('calls onBack on ArrowUp', () => {
    const onBack = vi.fn()
    renderHook(() =>
      useArrowNavigation({ enabled: true, onBack, onForward: vi.fn() })
    )

    dispatchArrowKey('ArrowUp')

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('calls onForward on ArrowRight', () => {
    const onForward = vi.fn()
    renderHook(() =>
      useArrowNavigation({ enabled: true, onBack: vi.fn(), onForward })
    )

    dispatchArrowKey('ArrowRight')

    expect(onForward).toHaveBeenCalledOnce()
  })

  it('calls onForward on ArrowDown', () => {
    const onForward = vi.fn()
    renderHook(() =>
      useArrowNavigation({ enabled: true, onBack: vi.fn(), onForward })
    )

    dispatchArrowKey('ArrowDown')

    expect(onForward).toHaveBeenCalledOnce()
  })

  it('does not call callbacks when disabled', () => {
    const onBack = vi.fn()
    const onForward = vi.fn()
    renderHook(() => useArrowNavigation({ enabled: false, onBack, onForward }))

    dispatchArrowKey('ArrowLeft')
    dispatchArrowKey('ArrowRight')

    expect(onBack).not.toHaveBeenCalled()
    expect(onForward).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const onBack = vi.fn()
    const { unmount } = renderHook(() =>
      useArrowNavigation({ enabled: true, onBack, onForward: vi.fn() })
    )

    unmount()

    dispatchArrowKey('ArrowLeft')

    expect(onBack).not.toHaveBeenCalled()
  })

  it('ignores non-arrow keys', () => {
    const onBack = vi.fn()
    const onForward = vi.fn()
    renderHook(() => useArrowNavigation({ enabled: true, onBack, onForward }))

    dispatchArrowKey('Enter')
    dispatchArrowKey('Space')
    dispatchArrowKey('a')

    expect(onBack).not.toHaveBeenCalled()
    expect(onForward).not.toHaveBeenCalled()
  })

  it('ignores arrow keys when an input element is focused', () => {
    const onBack = vi.fn()
    const onForward = vi.fn()
    renderHook(() => useArrowNavigation({ enabled: true, onBack, onForward }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
    })
    Object.defineProperty(event, 'target', { value: input })
    window.dispatchEvent(event)

    expect(onBack).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('ignores arrow keys when a textarea is focused', () => {
    const onBack = vi.fn()
    renderHook(() =>
      useArrowNavigation({
        enabled: true,
        onBack,
        onForward: vi.fn(),
      })
    )

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
    })
    Object.defineProperty(event, 'target', { value: textarea })
    window.dispatchEvent(event)

    expect(onBack).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  it('ignores arrow keys on elements with role="separator"', () => {
    const onForward = vi.fn()
    renderHook(() =>
      useArrowNavigation({
        enabled: true,
        onBack: vi.fn(),
        onForward,
      })
    )

    const separator = document.createElement('div')
    separator.setAttribute('role', 'separator')
    document.body.appendChild(separator)

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
    })
    Object.defineProperty(event, 'target', { value: separator })
    window.dispatchEvent(event)

    expect(onForward).not.toHaveBeenCalled()

    document.body.removeChild(separator)
  })
})

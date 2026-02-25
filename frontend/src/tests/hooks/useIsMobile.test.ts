import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockIsMobileDevice = vi.fn()

vi.mock('../../utils/isMobileDevice', () => ({
  isMobileDevice: (...args: unknown[]) => mockIsMobileDevice(...args),
}))

import { useIsMobile } from '../../hooks/useIsMobile'

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobileDevice.mockReturnValue(false)
  })

  it('returns initial value from isMobileDevice()', () => {
    mockIsMobileDevice.mockReturnValue(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when isMobileDevice returns false', () => {
    mockIsMobileDevice.mockReturnValue(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates on resize event', () => {
    mockIsMobileDevice.mockReturnValue(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    mockIsMobileDevice.mockReturnValue(true)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(true)
  })

  it('updates on orientationchange event', () => {
    mockIsMobileDevice.mockReturnValue(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    mockIsMobileDevice.mockReturnValue(true)
    act(() => {
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(result.current).toBe(true)
  })

  it('registers both event listeners on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useIsMobile())

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith(
      'orientationchange',
      expect.any(Function)
    )

    addSpy.mockRestore()
  })

  it('removes both event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith(
      'orientationchange',
      expect.any(Function)
    )

    removeSpy.mockRestore()
  })
})

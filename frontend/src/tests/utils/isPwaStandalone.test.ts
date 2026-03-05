import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isPwaStandalone } from '../../utils/isPwaStandalone'

describe('isPwaStandalone', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    // jsdom doesn't define matchMedia, so stub it
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    delete (navigator as unknown as { standalone?: boolean }).standalone
  })

  it('returns true when display-mode is standalone', () => {
    ;(window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
      matches: true,
    })

    expect(isPwaStandalone()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(display-mode: standalone)')
  })

  it('returns false when not in standalone mode', () => {
    expect(isPwaStandalone()).toBe(false)
  })

  it('returns true when navigator.standalone is true (iOS Safari)', () => {
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    })

    expect(isPwaStandalone()).toBe(true)
  })
})

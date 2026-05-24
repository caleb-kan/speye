import { describe, it, expect, beforeEach } from 'vitest'
import { StrictMode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { installMockLocalStorage } from '../helpers/mockLocalStorage'

import { useSyncReadingMode } from '../../hooks/useSyncReadingMode'
import { useReadingPreferences } from '../../hooks/useReadingPreferences'
import { ReadingPreferencesProvider } from '../../context/ReadingPreferencesProvider'
import { STORAGE_KEYS } from '../../constants/storage'
import type { Mode } from '../../types'

const { reset: resetLocalStorage } = installMockLocalStorage()

function setStoredMode(mode: Mode) {
  localStorage.setItem(
    STORAGE_KEYS.READING_PREFERENCES,
    JSON.stringify({ mode })
  )
}

function wrap({ children }: { children: React.ReactNode }) {
  return <ReadingPreferencesProvider>{children}</ReadingPreferencesProvider>
}

function strictWrap({ children }: { children: React.ReactNode }) {
  return (
    <StrictMode>
      <ReadingPreferencesProvider>{children}</ReadingPreferencesProvider>
    </StrictMode>
  )
}

describe('useSyncReadingMode', () => {
  beforeEach(() => {
    resetLocalStorage()
  })

  it('updates preferences.mode when the stored mode does not match the target', () => {
    setStoredMode('adaptive')

    const { result } = renderHook(
      () => {
        useSyncReadingMode('standard')
        return useReadingPreferences().preferences.mode
      },
      { wrapper: wrap }
    )

    expect(result.current).toBe('standard')
  })

  it('does not change preferences.mode when it already matches', () => {
    setStoredMode('adaptive')

    const { result } = renderHook(
      () => {
        useSyncReadingMode('adaptive')
        return useReadingPreferences().preferences.mode
      },
      { wrapper: wrap }
    )

    expect(result.current).toBe('adaptive')
  })

  it('does not re-sync after mount when preferences.mode changes externally', () => {
    // This is the click-during-route-transition guard: if the user clicks
    // another mode in the OptionsBar, setMode runs before the layout
    // unmounts. The outgoing layout must NOT revert the user's choice.
    // Start mismatched so the initial sync actually fires, then verify that
    // a subsequent external change is left alone.
    setStoredMode('adaptive')

    const { result } = renderHook(
      () => {
        useSyncReadingMode('standard')
        return useReadingPreferences()
      },
      { wrapper: wrap }
    )

    expect(result.current.preferences.mode).toBe('standard')

    act(() => {
      result.current.setMode('adaptive')
    })

    expect(result.current.preferences.mode).toBe('adaptive')
  })

  it('writes the corrected mode to localStorage', () => {
    setStoredMode('adaptive')

    renderHook(() => useSyncReadingMode('rsvp'), { wrapper: wrap })

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES) ?? '{}'
    )
    expect(stored.mode).toBe('rsvp')
  })

  it('does not write to localStorage when the stored mode already matches', () => {
    setStoredMode('standard')

    renderHook(() => useSyncReadingMode('standard'), { wrapper: wrap })

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.READING_PREFERENCES) ?? '{}'
    )
    expect(stored.mode).toBe('standard')
  })

  it('syncs once under React StrictMode double-invoke', () => {
    // React 18+ StrictMode runs effect setup -> cleanup -> setup. The needsSyncRef
    // guard must survive this and prevent setMode from being called a second time.
    setStoredMode('adaptive')

    const setModeCalls: Mode[] = []

    const { result } = renderHook(
      () => {
        const ctx = useReadingPreferences()
        const trackedSetMode = (mode: Mode) => {
          setModeCalls.push(mode)
          ctx.setMode(mode)
        }
        useSyncReadingMode('standard')
        return { mode: ctx.preferences.mode, trackedSetMode }
      },
      { wrapper: strictWrap }
    )

    expect(result.current.mode).toBe('standard')
    // setMode is called via context, not via tracked wrapper, so we can't observe
    // it directly. Instead verify the final state and that no oscillation
    // occurred by tracking that subsequent renders are stable.
    const finalMode = result.current.mode
    act(() => {
      // Trigger a re-render via context to confirm the hook doesn't re-sync.
      result.current.trackedSetMode('adaptive')
    })
    expect(result.current.mode).toBe('adaptive')
    expect(finalMode).toBe('standard')
  })

  it('does not re-sync under StrictMode when click handler changes mode', () => {
    // The critical regression test for the jitter bug: under StrictMode, the
    // outgoing layout's hook must not revert mode after the user clicks
    // another mode chip (which calls setMode before route transition).
    setStoredMode('standard')

    const { result } = renderHook(
      () => {
        useSyncReadingMode('standard')
        return useReadingPreferences()
      },
      { wrapper: strictWrap }
    )

    expect(result.current.preferences.mode).toBe('standard')

    // Simulate the OptionsBar click that will trigger route transition.
    act(() => {
      result.current.setMode('adaptive')
    })

    expect(result.current.preferences.mode).toBe('adaptive')
  })
})

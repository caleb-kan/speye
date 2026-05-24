import { useEffect, useRef } from 'react'
import type { Mode } from '../types'
import { useReadingPreferences } from './useReadingPreferences'

/**
 * Locks `preferences.mode` to the layout's mode on mount.
 *
 * The URL is the source of truth for the active reading mode. If a user
 * lands on a reading page (direct URL, bookmark, browser session restore)
 * while the persisted mode belongs to a different mode, this brings them
 * into sync so the OptionsBar chip and the Navbar Home target both match.
 *
 * Why guarded with a one-shot ref instead of reacting to `preferences.mode`:
 * The OptionsBar mode buttons update `preferences.mode` *before* the route
 * transitions. During the transition both the outgoing and incoming layout
 * are momentarily mounted; if `preferences.mode` were in the effect deps,
 * the outgoing layout would re-fire and race to revert the user's choice
 * before the new layout took over, causing a visible mode-toggle bounce
 * (jitter). `needsSyncRef` captures whether a sync is needed at first
 * render and the effect runs at most once per mount, even though its
 * `[mode, setMode]` deps would otherwise allow it.
 */
export function useSyncReadingMode(mode: Mode): void {
  const { preferences, setMode } = useReadingPreferences()
  const needsSyncRef = useRef(preferences.mode !== mode)
  useEffect(() => {
    if (needsSyncRef.current) {
      setMode(mode)
      needsSyncRef.current = false
    }
  }, [mode, setMode])
}

const FORCE_OFFLINE_KEY = 'speye-force-offline'

let forceOffline = false

// Initialise from localStorage (safe for SSR — guard against missing window)
try {
  forceOffline = localStorage.getItem(FORCE_OFFLINE_KEY) === 'true'
} catch {
  // localStorage unavailable (e.g. SSR or private browsing)
}

/** Returns `true` when the app should behave as offline —
 *  either the browser is actually offline or the user toggled "force offline". */
export function isOffline(): boolean {
  return !navigator.onLine || forceOffline
}

export function getForceOffline(): boolean {
  return forceOffline
}

export function setForceOffline(value: boolean): void {
  forceOffline = value
  try {
    if (value) {
      localStorage.setItem(FORCE_OFFLINE_KEY, 'true')
    } else {
      localStorage.removeItem(FORCE_OFFLINE_KEY)
    }
  } catch {
    // localStorage unavailable
  }
}

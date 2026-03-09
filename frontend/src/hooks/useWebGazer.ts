import { useState, useEffect, useCallback, useRef } from 'react'
import type { GazeData } from '../types/webgazer'
import type { WebGazerStatus, WebGazerError } from '../types/adaptive'
import { STORAGE_KEYS } from '../constants/storage'
import {
  WEBGAZER_INIT_TIMEOUT_MS,
  WEBGAZER_READY_MAX_ATTEMPTS,
  WEBGAZER_READY_CHECK_INTERVAL_MS,
  WEBGAZER_GAZE_DOT_ID,
  WEBGAZER_DOT_STYLE_ID,
  WEBGAZER_REGRESSION_MODEL,
  CALIBRATION_EVENT_TYPE,
  STATE_UPDATE_INTERVAL_MS,
} from '../constants/adaptive'

/**
 * Module-level WebGazer state tracking.
 * WebGazer is a singleton that doesn't cleanly reinitialize after end().
 * We use stopCamera() to turn off the camera when leaving adaptive mode,
 * and resume() to restart it when returning. This preserves calibration
 * data while allowing the camera to be properly released.
 */
let globalWebgazerInstance: WebGazerAPI | null = null
let isGloballyInitialized = false
// Pending cleanup timeout. Used to delay stopCamera() so React StrictMode's
// double-invoke (effect1 -> cleanup -> effect2) doesn't interrupt the camera.
// If effect2 starts before the timeout fires, we cancel it.
let pendingCleanupTimeout: ReturnType<typeof setTimeout> | null = null

/** CSS rule to hide the WebGazer gaze prediction dot */
const HIDE_GAZE_DOT_CSS = `#${WEBGAZER_GAZE_DOT_ID} { display: none !important; }`

type UseWebGazerOptions = {
  /** Whether WebGazer should be active */
  enabled: boolean
  /** Show webcam preview (default: false) */
  showPreview?: boolean
  /** Show red prediction dot (default: false) */
  showPredictionPoints?: boolean
  /** Callback for gaze data */
  onGaze?: (data: GazeData | null, elapsedTime: number) => void
}

type UseWebGazerReturn = {
  /** Current status of WebGazer */
  status: WebGazerStatus
  /** Whether WebGazer is ready to provide predictions */
  isReady: boolean
  /** Error message if initialization failed */
  error: string | null
  /** Error type for programmatic handling */
  errorType: WebGazerError | null
  /** Clear all calibration data */
  clearData: () => Promise<void>
  /** Record a screen position for calibration training */
  recordScreenPosition: (x: number, y: number) => void
}

/**
 * Typed interface for the WebGazer API methods we use.
 * WebGazer uses a chainable API pattern where most methods return the instance.
 */
interface WebGazerAPI {
  begin(): Promise<WebGazerAPI>
  end(): void
  pause(): void
  resume(): Promise<WebGazerAPI>
  stopCamera(): WebGazerAPI
  clearData(): Promise<void>
  recordScreenPosition(x: number, y: number, eventType: string): void
  isReady(): boolean
  setRegression(type: string): WebGazerAPI
  saveDataAcrossSessions(save: boolean): WebGazerAPI
  showVideoPreview(show: boolean): WebGazerAPI
  showPredictionPoints(show: boolean): WebGazerAPI
  showFaceOverlay(show: boolean): WebGazerAPI
  showFaceFeedbackBox(show: boolean): WebGazerAPI
  applyKalmanFilter(apply: boolean): WebGazerAPI
  setGazeListener(
    callback: (data: GazeData | null, time: number) => void
  ): WebGazerAPI
  removeMouseEventListeners(): void
}

/**
 * Hook to manage WebGazer eye-tracking lifecycle
 *
 * Uses local WebGazer source with TFJS runtime for reliable model loading
 * (no external CDN dependencies)
 *
 * Handles:
 * - Dynamic import of webgazer module
 * - Webcam permission requests
 * - Initialization and cleanup
 * - Gaze data streaming
 */
export function useWebGazer({
  enabled,
  showPreview = false,
  showPredictionPoints = false,
  onGaze,
}: UseWebGazerOptions): UseWebGazerReturn {
  const [status, setStatus] = useState<WebGazerStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<WebGazerError | null>(null)

  const webgazerRef = useRef<WebGazerAPI | null>(null)
  const onGazeRef = useRef(onGaze)
  const isInitializedRef = useRef(false)
  const lastGazeCallbackRef = useRef(0)

  useEffect(() => {
    onGazeRef.current = onGaze
  }, [onGaze])

  useEffect(() => {
    // When disabled, let any pending cleanup (stopCamera) proceed
    if (!enabled) {
      return
    }

    // Cancel any pending cleanup from a previous effect (React StrictMode double-invoke)
    // Only cancel when we're about to reinitialize - not when disabling
    if (pendingCleanupTimeout) {
      clearTimeout(pendingCleanupTimeout)
      pendingCleanupTimeout = null
    }

    // Prevent double initialization within this component instance
    if (isInitializedRef.current) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('not-supported')
      setError(
        'Your browser does not support webcam access. Please use a modern browser like Chrome, Firefox, or Edge.'
      )
      setErrorType('not-supported')
      return
    }

    let mounted = true
    // Ref to track mounted state for gaze listener (closure captures this)
    const mountedRef = { current: true }

    // Helper to set up the gaze listener with current callback
    const setupGazeListener = (webgazer: WebGazerAPI) => {
      webgazer.setGazeListener((data: GazeData | null, elapsedTime: number) => {
        if (!mountedRef.current || !onGazeRef.current) return

        // Throttle callbacks to prevent excessive state updates
        // WebGazer calls this ~60fps, we limit to ~30fps
        const now = Date.now()
        if (now - lastGazeCallbackRef.current < STATE_UPDATE_INTERVAL_MS) {
          return
        }
        lastGazeCallbackRef.current = now

        onGazeRef.current(data, elapsedTime)
      })
    }

    // Reattach to existing WebGazer instance and resume camera if stopped
    const reattachWebGazer = async () => {
      if (!globalWebgazerInstance) {
        return false
      }

      setStatus('initializing')

      try {
        webgazerRef.current = globalWebgazerInstance

        // Set up gaze listener BEFORE resuming so the loop has a valid callback
        setupGazeListener(globalWebgazerInstance)

        globalWebgazerInstance
          .showVideoPreview(showPreview)
          .showPredictionPoints(showPredictionPoints)
          .showFaceFeedbackBox(showPreview)

        await globalWebgazerInstance.resume()

        // Check if component unmounted during async resume
        // If so, just return false - do NOT call stopCamera() here!
        // React StrictMode may have started another effect that's now using the camera.
        // The cleanup timeout mechanism will handle stopping the camera if needed.
        if (!mounted) {
          return false
        }

        isInitializedRef.current = true
        setStatus('ready')
        return true
      } catch (err) {
        // Resume failed - clean up and clear global state so initWebGazer runs fresh
        if (import.meta.env.DEV) {
          console.warn('WebGazer resume failed, will reinitialize:', err)
        }
        // Call end() to remove DOM elements before reinitializing
        // This prevents duplicate elements when begin() creates new ones
        // Calibration data is preserved in localforage storage
        try {
          globalWebgazerInstance?.end()
        } catch {
          // Ignore end() errors
        }
        globalWebgazerInstance = null
        isGloballyInitialized = false
        return false
      }
    }

    const initWebGazer = async () => {
      // Reattach to existing WebGazer if already initialized globally
      if (isGloballyInitialized && globalWebgazerInstance) {
        const reattached = await reattachWebGazer()
        if (reattached) return
      }

      setStatus('initializing')
      setError(null)
      setErrorType(null)

      // One-time migration: clear old calibration data when regression
      // model changes. Old data trained with 'ridge' is incompatible
      // with 'weightedRidge' and corrupts predictions.
      const storedRegression = localStorage.getItem(
        STORAGE_KEYS.WEBGAZER_REGRESSION_VERSION
      )
      if (storedRegression !== WEBGAZER_REGRESSION_MODEL) {
        try {
          // Clear only the default localforage instance (where webgazer stores
          // calibration data). The app's offline caches use named instances
          // ('speye-offline') and are not affected by this clear.
          const localforage = await import('localforage')
          await localforage.default.clear()
        } catch (e) {
          // If localforage clear fails, calibration data from the old model may
          // persist and corrupt predictions. Log but continue -- better to attempt
          // recalibration than to block initialization entirely.
          console.warn('Failed to clear old webgazer calibration data:', e)
        }
        // Always update the version key and clear localStorage calibration state,
        // regardless of whether localforage clear succeeded, to prevent infinite
        // migration retries that would block every init.
        localStorage.removeItem(STORAGE_KEYS.ADAPTIVE_CALIBRATION)
        localStorage.setItem(
          STORAGE_KEYS.WEBGAZER_REGRESSION_VERSION,
          WEBGAZER_REGRESSION_MODEL
        )
      }

      try {
        // Dynamic import of local webgazer source (uses TFJS runtime, no CDN deps)
        // 'webgazer' is aliased to local source in vite.config.ts
        const webgazerModule = await import('webgazer')
        const webgazer = webgazerModule.default as WebGazerAPI

        if (!mounted) return

        webgazerRef.current = webgazer
        globalWebgazerInstance = webgazer

        // weightedRidge provides better accuracy than default ridge regression
        // saveDataAcrossSessions(true) so recalibration builds on previous data
        webgazer
          .setRegression(WEBGAZER_REGRESSION_MODEL)
          .saveDataAcrossSessions(true)
          .showVideoPreview(showPreview)
          .showPredictionPoints(showPredictionPoints)
          .showFaceOverlay(false)
          .showFaceFeedbackBox(showPreview)
          .applyKalmanFilter(true)

        // Set up gaze listener with mounted guard and throttling to prevent
        // excessive state updates. WebGazer calls this ~60fps via requestAnimationFrame,
        // which can overwhelm React. Throttle to ~30fps to stay responsive without
        // triggering "Maximum update depth exceeded" errors.
        setupGazeListener(webgazer)

        // Add a timeout to prevent hanging forever if camera permission is not granted
        const beginWithTimeout = () =>
          new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('WebGazer initialization timed out'))
            }, WEBGAZER_INIT_TIMEOUT_MS)

            webgazer
              .begin()
              .then(() => {
                clearTimeout(timeout)
                resolve()
              })
              .catch((err: unknown) => {
                clearTimeout(timeout)
                reject(err instanceof Error ? err : new Error(String(err)))
              })
          })

        await beginWithTimeout()

        // WebGazer is now running - mark as globally initialized immediately
        // so remounting components can reattach even if we return early below
        isGloballyInitialized = true

        // Check if component unmounted during async begin()
        // If so, just return - do NOT call stopCamera() here!
        // React StrictMode may have started another effect that's now using the camera.
        // The cleanup timeout mechanism will handle stopping the camera if needed.
        if (!mounted) {
          return
        }

        // Wait for WebGazer to be fully ready (face detection loaded)
        const checkReady = () =>
          new Promise<void>((resolve, reject) => {
            let attempts = 0
            const check = () => {
              if (!mounted) {
                reject(new Error('Component unmounted'))
                return
              }
              if (webgazer.isReady()) {
                resolve()
              } else if (attempts++ > WEBGAZER_READY_MAX_ATTEMPTS) {
                reject(
                  new Error(
                    'WebGazer failed to become ready - face detection may not have loaded'
                  )
                )
              } else {
                setTimeout(check, WEBGAZER_READY_CHECK_INTERVAL_MS)
              }
            }
            check()
          })

        await checkReady()

        // Check if component unmounted during async checkReady()
        // If so, just return - do NOT call stopCamera() here!
        // React StrictMode may have started another effect that's now using the camera.
        // The cleanup timeout mechanism will handle stopping the camera if needed.
        if (!mounted) {
          return
        }

        isInitializedRef.current = true
        // isGloballyInitialized already set after begin() above

        // Remove mouse event listeners so gaze prediction doesn't follow cursor
        // We only want to use explicit calibration clicks, not ongoing mouse movements
        webgazer.removeMouseEventListeners()

        // Note: Prediction point visibility is controlled by the style element
        // created in the showPredictionPoints useEffect below. We don't set
        // inline styles here because WebGazer's internal loop can override them.

        setStatus('ready')
      } catch (err) {
        if (!mounted) return

        // Clear global state on failure
        globalWebgazerInstance = null
        isGloballyInitialized = false

        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to initialize eye tracking'

        // Check for permission errors
        if (
          errorMessage.includes('Permission') ||
          errorMessage.includes('NotAllowedError')
        ) {
          setStatus('permission-denied')
          setError(
            'Camera access was denied. Please allow camera access to use adaptive reading mode.'
          )
          setErrorType('permission-denied')
        } else {
          setStatus('error')
          setError(errorMessage)
          setErrorType('initialization-failed')
        }
      }
    }

    initWebGazer()

    return () => {
      mounted = false
      mountedRef.current = false
      // NOTE: Do NOT clear onGazeRef.current here!
      // When the component stays mounted but enabled changes (e.g., switching
      // to standard mode), the effect at line 109-111 won't re-run because
      // its dependency is [onGaze], not [enabled]. If we clear onGazeRef here,
      // it stays undefined when enabled becomes true again, breaking the
      // gaze listener callback.

      // Delay stopping the camera to handle React StrictMode double-invoke.
      // StrictMode runs: effect1 -> cleanup -> effect2 (synchronously)
      // If effect2 starts, it will cancel this timeout and keep the camera running.
      // If no effect2 starts (real unmount), the timeout fires and stops the camera.
      if (globalWebgazerInstance) {
        pendingCleanupTimeout = setTimeout(() => {
          pendingCleanupTimeout = null
          if (globalWebgazerInstance) {
            globalWebgazerInstance.stopCamera()
          }
        }, 0) // setTimeout(..., 0) runs after the current synchronous block
      }

      webgazerRef.current = null
      isInitializedRef.current = false
      lastGazeCallbackRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showPreview/showPredictionPoints are only needed for initial config; separate effects handle updates
  }, [enabled])

  useEffect(() => {
    if (webgazerRef.current && isInitializedRef.current) {
      webgazerRef.current.showVideoPreview(showPreview)
      webgazerRef.current.showFaceFeedbackBox(showPreview)
    }
  }, [showPreview])

  // Update prediction points visibility when prop changes OR when WebGazer becomes ready
  // Uses a persistent style element to ensure the dot stays hidden even if
  // WebGazer's internal loop tries to show it
  //
  // Note: We depend on `status` because `showPredictionPoints` may already be true
  // when the component mounts (e.g., during calibration). Without this dependency,
  // the API call would be skipped on first render (WebGazer not initialized yet)
  // and never re-run after initialization completes.
  useEffect(() => {
    if (webgazerRef.current && isInitializedRef.current) {
      webgazerRef.current.showPredictionPoints(showPredictionPoints)
    }

    // Create or update a style element to control gaze dot visibility
    // This is more robust than setting inline styles which WebGazer might override
    let styleEl = document.getElementById(
      WEBGAZER_DOT_STYLE_ID
    ) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = WEBGAZER_DOT_STYLE_ID
      document.head.appendChild(styleEl)
    }

    if (showPredictionPoints) {
      styleEl.textContent = '' // Remove hiding rule
    } else {
      styleEl.textContent = HIDE_GAZE_DOT_CSS
    }

    return () => {
      // On unmount, ensure the dot is hidden (don't remove the style element)
      // This prevents the dot from becoming visible if WebGazer hasn't fully stopped yet
      const el = document.getElementById(
        WEBGAZER_DOT_STYLE_ID
      ) as HTMLStyleElement | null
      if (el) {
        el.textContent = HIDE_GAZE_DOT_CSS
      }
    }
  }, [showPredictionPoints, status])

  const clearData = useCallback(async () => {
    if (webgazerRef.current) {
      await webgazerRef.current.clearData()
    }
    // DO NOT reset global state - WebGazer is still running
    // We only cleared its calibration data so it can be retrained
    // The next mount should reattach, not reinitialize
  }, [])

  const recordScreenPosition = useCallback((x: number, y: number) => {
    if (webgazerRef.current && isInitializedRef.current) {
      webgazerRef.current.recordScreenPosition(x, y, CALIBRATION_EVENT_TYPE)
    }
  }, [])

  return {
    status,
    isReady: status === 'ready',
    error,
    errorType,
    clearData,
    recordScreenPosition,
  }
}

import { StrictMode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../../constants/storage'
import {
  WEBGAZER_INIT_TIMEOUT_MS,
  WEBGAZER_REGRESSION_MODEL,
} from '../../constants/adaptive'

const { webgazer, camera } = vi.hoisted(() => ({
  camera: { active: false },
  webgazer: {
    begin: vi.fn(),
    resume: vi.fn(),
    stopCamera: vi.fn(),
    end: vi.fn(),
    isReady: vi.fn(),
    setRegression: vi.fn().mockReturnThis(),
    saveDataAcrossSessions: vi.fn().mockReturnThis(),
    showVideoPreview: vi.fn().mockReturnThis(),
    showPredictionPoints: vi.fn().mockReturnThis(),
    showFaceOverlay: vi.fn().mockReturnThis(),
    showFaceFeedbackBox: vi.fn().mockReturnThis(),
    applyKalmanFilter: vi.fn().mockReturnThis(),
    setGazeListener: vi.fn().mockReturnThis(),
    removeMouseEventListeners: vi.fn(),
    clearData: vi.fn(),
    recordScreenPosition: vi.fn(),
  },
}))

function deferredStart() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  }).then(() => {
    camera.active = true
    return webgazer
  })
  return { promise, resolve }
}

function captureInitializationTimeout() {
  let expireInitialization!: () => void
  const setTimeout = globalThis.setTimeout
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(
    (callback, delay, ...args) => {
      const timer = setTimeout(callback, delay, ...args)
      if (delay === WEBGAZER_INIT_TIMEOUT_MS) {
        expireInitialization = () => {
          clearTimeout(timer)
          if (typeof callback === 'function') callback(...args)
        }
      }
      return timer
    }
  )
  return () => expireInitialization()
}

let useWebGazer: typeof import('../../hooks/useWebGazer').useWebGazer

beforeEach(async () => {
  vi.resetModules()
  const module = await import('webgazer')
  Object.assign(module.default, webgazer)
  vi.clearAllMocks()
  camera.active = false
  webgazer.begin.mockImplementation(async () => {
    camera.active = true
    return webgazer
  })
  webgazer.resume.mockImplementation(async () => {
    camera.active = true
    return webgazer
  })
  webgazer.stopCamera.mockImplementation(() => {
    camera.active = false
    return webgazer
  })
  webgazer.end.mockImplementation(() => {
    camera.active = false
    return webgazer
  })
  webgazer.isReady.mockReturnValue(true)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  })
  localStorage.setItem(
    STORAGE_KEYS.WEBGAZER_REGRESSION_VERSION,
    WEBGAZER_REGRESSION_MODEL
  )
  ;({ useWebGazer } = await import('../../hooks/useWebGazer'))
})

afterEach(async () => {
  cleanup()
  await act(async () => {})
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useWebGazer camera ownership', () => {
  it('releases a camera granted after its reader unmounts', async () => {
    const start = deferredStart()
    webgazer.begin.mockReturnValue(start.promise)
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(webgazer.begin).toHaveBeenCalledOnce())
    reader.unmount()
    await act(async () => {})
    await act(async () => start.resolve())
    expect(camera.active).toBe(false)
  })

  it('releases a resumed camera granted after navigating away again', async () => {
    const first = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(first.result.current.isReady).toBe(true))
    first.unmount()
    await act(async () => {})

    const start = deferredStart()
    webgazer.resume.mockReturnValue(start.promise)
    const second = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(webgazer.resume).toHaveBeenCalledOnce())
    second.unmount()
    await act(async () => {})
    await act(async () => start.resolve())
    expect(camera.active).toBe(false)
    expect(webgazer.begin).toHaveBeenCalledOnce()
  })

  it('keeps a shared pending start alive for a replacement reader', async () => {
    const start = deferredStart()
    webgazer.begin.mockReturnValue(start.promise)
    const first = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(webgazer.begin).toHaveBeenCalledOnce())
    first.unmount()
    const second = renderHook(() => useWebGazer({ enabled: true }), {
      wrapper: StrictMode,
    })
    await act(async () => start.resolve())
    await waitFor(() =>
      expect({
        status: second.result.current.status,
        error: second.result.current.error,
      }).toEqual({ status: 'ready', error: null })
    )
    expect(webgazer.begin).toHaveBeenCalledOnce()
    expect(camera.active).toBe(true)
    second.unmount()
    await act(async () => {})
    expect(camera.active).toBe(false)
  })

  it('releases the stream when initialization fails after camera acquisition', async () => {
    webgazer.begin.mockImplementation(async () => {
      camera.active = true
      throw new Error('Failed to load face detection model')
    })
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(reader.result.current.status).toBe('error'))
    expect(camera.active).toBe(false)
  })

  it('retries an earlier canceled request for the current reader', async () => {
    webgazer.begin.mockRejectedValueOnce(
      new DOMException('Camera request was canceled', 'AbortError')
    )
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(reader.result.current.isReady).toBe(true))
    expect(webgazer.begin).toHaveBeenCalledTimes(2)
    expect(camera.active).toBe(true)
  })

  it('releases a camera that resolves after the initialization timeout', async () => {
    const expireInitialization = captureInitializationTimeout()
    const start = deferredStart()
    webgazer.begin.mockReturnValue(start.promise)
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(webgazer.begin).toHaveBeenCalledOnce())
    await act(async () => expireInitialization())
    expect(reader.result.current.status).toBe('error')
    await act(async () => start.resolve())
    expect(camera.active).toBe(false)
  })

  it('does not reopen the camera when timeout cleanup cancels initialization', async () => {
    const expireInitialization = captureInitializationTimeout()
    let rejectStart!: (error: DOMException) => void
    webgazer.begin.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectStart = reject
      })
    )
    webgazer.end.mockImplementation(() => {
      camera.active = false
      rejectStart(new DOMException('Camera request was canceled', 'AbortError'))
    })
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() => expect(webgazer.begin).toHaveBeenCalledOnce())
    await act(async () => expireInitialization())
    expect(reader.result.current.status).toBe('error')
    expect(webgazer.begin).toHaveBeenCalledOnce()
    expect(camera.active).toBe(false)
  })

  it('recognizes a browser permission denial by its DOMException name', async () => {
    webgazer.begin.mockRejectedValue(
      new DOMException('The request is not allowed.', 'NotAllowedError')
    )
    const reader = renderHook(() => useWebGazer({ enabled: true }))
    await waitFor(() =>
      expect(reader.result.current.status).toBe('permission-denied')
    )
    expect(camera.active).toBe(false)
  })
})

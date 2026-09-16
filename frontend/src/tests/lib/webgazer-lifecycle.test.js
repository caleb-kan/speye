import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'

const { predict } = vi.hoisted(() => ({ predict: vi.fn() }))
vi.mock('@tensorflow/tfjs', () => ({}))
vi.mock('../../lib/webgazer-local/src/facemesh.mjs', () => ({
  default: class {
    getEyePatches(...args) {
      return predict(...args)
    }
  },
}))

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function cameraStream() {
  const track = {
    readyState: 'live',
    stop: vi.fn(() => {
      track.readyState = 'ended'
    }),
  }
  return { stream: { getTracks: () => [track] }, track }
}

let webgazer
let getUserMedia

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  predict.mockResolvedValue(null)
  getUserMedia = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    clearRect: vi.fn(),
  })
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(
    480
  )
  vi.spyOn(HTMLVideoElement.prototype, 'readyState', 'get').mockReturnValue(2)
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  ;({ default: webgazer } =
    await import('../../lib/webgazer-local/src/index.mjs'))
  webgazer
    .saveDataAcrossSessions(false)
    .showFaceOverlay(false)
    .showFaceFeedbackBox(false)
    .showPredictionPoints(false)
})

afterEach(() => {
  webgazer?.end()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

async function videoLoaded() {
  await waitFor(() =>
    expect(
      document.getElementById(webgazer.params.videoElementId)
    ).not.toBeNull()
  )
  document
    .getElementById(webgazer.params.videoElementId)
    .dispatchEvent(new Event('loadeddata'))
}

describe('local WebGazer camera lifecycle', () => {
  it('stops canceled late permission before video or model initialization', async () => {
    const request = deferred()
    const { stream, track } = cameraStream()
    getUserMedia.mockReturnValue(request.promise)
    const started = webgazer.begin().catch((error) => error)
    webgazer.stopCamera()
    request.resolve(stream)
    await waitFor(() => expect(track.readyState).toBe('ended'))
    expect(await started).toMatchObject({ name: 'AbortError' })
    expect(predict).not.toHaveBeenCalled()
    expect(document.getElementById(webgazer.params.videoElementId)).toBeNull()
  })

  it('releases an acquired stream and DOM when the model fails to load', async () => {
    const { stream, track } = cameraStream()
    getUserMedia.mockResolvedValue(stream)
    predict.mockRejectedValue(new Error('Model fetch failed'))
    const started = webgazer.begin().catch((error) => error)
    await videoLoaded()
    expect(await started).toMatchObject({ message: 'Model fetch failed' })
    expect(track.readyState).toBe('ended')
    expect(document.getElementById(webgazer.params.videoElementId)).toBeNull()
  })

  it('stops a late resumed stream before running another prediction', async () => {
    const first = cameraStream()
    getUserMedia.mockResolvedValueOnce(first.stream)
    const started = webgazer.begin()
    await videoLoaded()
    await started
    webgazer.stopCamera()
    const request = deferred()
    const second = cameraStream()
    getUserMedia.mockReturnValueOnce(request.promise)
    const resumed = webgazer.resume().catch((error) => error)
    webgazer.stopCamera()
    request.resolve(second.stream)
    await waitFor(() => expect(second.track.readyState).toBe('ended'))
    expect(await resumed).toMatchObject({ name: 'AbortError' })
    expect(predict).toHaveBeenCalledOnce()
  })

  it('cancels a pending model load and allows a fresh start', async () => {
    const first = cameraStream()
    const second = cameraStream()
    getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream)
    const prediction = deferred()
    predict.mockReturnValueOnce(prediction.promise)
    const gaze = vi.fn()
    webgazer.setGazeListener(gaze)
    const started = webgazer.begin().catch((error) => error)
    await videoLoaded()
    await waitFor(() => expect(predict).toHaveBeenCalledOnce())
    webgazer.stopCamera()
    expect(await started).toMatchObject({ name: 'AbortError' })
    expect(first.track.readyState).toBe('ended')

    const restarted = webgazer.begin()
    await videoLoaded()
    await restarted
    prediction.resolve(null)
    await Promise.resolve()
    expect(gaze).toHaveBeenCalledOnce()
    expect(second.track.readyState).toBe('live')
    expect(document.querySelectorAll('video')).toHaveLength(1)
  })

  it('cancels before video data arrives without leaving startup pending', async () => {
    const { stream, track } = cameraStream()
    getUserMedia.mockResolvedValue(stream)
    const started = webgazer.begin().catch((error) => error)
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
    webgazer.end()
    expect(await started).toMatchObject({ name: 'AbortError' })
    expect(track.readyState).toBe('ended')
    expect(document.querySelector('video')).toBeNull()
    expect(predict).not.toHaveBeenCalled()
  })

  it('does not publish or schedule stale predictions after stopping and resuming', async () => {
    const first = cameraStream()
    const second = cameraStream()
    getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream)
    const gaze = vi.fn()
    webgazer.setGazeListener(gaze)
    const started = webgazer.begin()
    await videoLoaded()
    await started

    const prediction = deferred()
    predict.mockReturnValueOnce(prediction.promise)
    const nextFrame = window.requestAnimationFrame.mock.calls[0][0]
    const pendingFrame = nextFrame()
    webgazer.stopCamera()
    await webgazer.resume()
    const callbacksBeforeStaleResult = gaze.mock.calls.length
    const framesBeforeStaleResult =
      window.requestAnimationFrame.mock.calls.length
    prediction.resolve(null)
    await pendingFrame
    expect(gaze).toHaveBeenCalledTimes(callbacksBeforeStaleResult)
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(
      framesBeforeStaleResult
    )
    expect(second.track.readyState).toBe('live')
  })
})

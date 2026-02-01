/**
 * WebGazer type declarations
 */

export interface GazeData {
  x: number
  y: number
}

export interface WebGazerParams {
  storingPoints: boolean
  showVideoPreview: boolean
  showFaceOverlay: boolean
  showFaceFeedbackBox: boolean
  showGazeDot: boolean
  saveDataAcrossSessions: boolean
  camConstraints: MediaStreamConstraints
  videoViewerWidth: number
  videoViewerHeight: number
}

export interface WebGazer {
  // Lifecycle
  begin(): Promise<WebGazer>
  end(): WebGazer
  pause(): WebGazer
  resume(): Promise<WebGazer>
  isReady(): boolean

  // Gaze listener
  setGazeListener(
    callback: (data: GazeData | null, elapsedTime: number) => void
  ): WebGazer
  clearGazeListener(): WebGazer

  // Configuration
  saveDataAcrossSessions(save: boolean): WebGazer
  showVideoPreview(show: boolean): WebGazer
  showVideo(show: boolean): WebGazer
  showPredictionPoints(show: boolean): WebGazer
  showFaceOverlay(show: boolean): WebGazer
  showFaceFeedbackBox(show: boolean): WebGazer
  applyKalmanFilter(apply: boolean): WebGazer

  // Calibration data
  clearData(): Promise<void>
  getStoredPoints(): [number[], number[]] | null
  recordScreenPosition(
    x: number,
    y: number,
    eventType?: 'click' | 'move'
  ): WebGazer

  // Regression model
  setRegression(type: 'ridge' | 'weightedRidge' | 'threadedRidge'): WebGazer
  setTracker(type: 'TFFacemesh'): WebGazer

  // Camera
  setCameraConstraints(constraints: MediaStreamConstraints): Promise<void>
  setVideoViewerSize(width: number, height: number): void

  // Mouse event listeners for training
  addMouseEventListeners(): WebGazer
  removeMouseEventListeners(): WebGazer

  // Direct prediction
  getCurrentPrediction(): Promise<GazeData | null>

  // Parameters
  params: WebGazerParams
}

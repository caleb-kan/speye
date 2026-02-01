import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type {
  CalibrationPointState,
  CalibrationPhase,
  WebGazerStatus,
} from '../../../types/adaptive'
import { calculateCalibrationPoints } from './calibrationUtils'
import {
  CALIBRATION_CLICKS_PER_POINT,
  CALIBRATION_CLICK_SETTLE_MS,
  CALIBRATION_CLICK_DEBOUNCE_MS,
  DEFAULT_CALIBRATION_POINT_COUNT,
} from '../../../constants/calibration'

/** Minimum size change (px) to trigger calibration point recalculation */
const RESIZE_SIGNIFICANT_THRESHOLD_PX = 50
/** Debounce delay (ms) for resize handling during calibration */
const RESIZE_DEBOUNCE_MS = 200

type UseCalibrationPhaseOptions = {
  webgazerStatus: WebGazerStatus
  recordScreenPosition: (x: number, y: number) => void
}

type UseCalibrationPhaseReturn = {
  phase: CalibrationPhase
  points: CalibrationPointState[]
  currentPointIndex: number
  containerRect: DOMRect | null
  readingAreaRef: React.RefObject<HTMLDivElement | null>
  handleStartCalibration: () => void
  handlePointClick: () => void
  markComplete: () => void
  totalPoints: number
}

export function useCalibrationPhase({
  webgazerStatus,
  recordScreenPosition,
}: UseCalibrationPhaseOptions): UseCalibrationPhaseReturn {
  const [phase, setPhase] = useState<CalibrationPhase>('intro')
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  const [points, setPoints] = useState<CalibrationPointState[]>([])

  const readingAreaRef = useRef<HTMLDivElement | null>(null)
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const pointsInitializedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current)
      }
    }
  }, [])

  const calibrationPositions = useMemo(() => {
    if (!containerRect) return []
    return calculateCalibrationPoints(containerRect)
  }, [containerRect])

  const totalPoints =
    calibrationPositions.length || DEFAULT_CALIBRATION_POINT_COUNT

  // Initialize points when calibration positions are calculated
  useEffect(() => {
    if (calibrationPositions.length > 0 && !pointsInitializedRef.current) {
      pointsInitializedRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state init
      setPoints(
        calibrationPositions.map((pos, index) => ({
          id: index,
          x: pos.x,
          y: pos.y,
          clicksRemaining: CALIBRATION_CLICKS_PER_POINT,
          isComplete: false,
        }))
      )
    }
  }, [calibrationPositions])

  // Initial measurement when calibration starts
  useEffect(() => {
    if (phase === 'calibrating' && readingAreaRef.current) {
      setContainerRect(readingAreaRef.current.getBoundingClientRect())
    }
  }, [phase])

  // Handle resize during calibration with debounce and significant change threshold
  const lastRectRef = useRef<{ width: number; height: number } | null>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase !== 'calibrating' || !readingAreaRef.current) return

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0]
      if (!entry || !readingAreaRef.current) return

      const newRect = entry.contentRect
      const lastRect = lastRectRef.current

      // Check if resize is significant enough to warrant recalculation
      const isSignificant =
        !lastRect ||
        Math.abs(newRect.width - lastRect.width) >
          RESIZE_SIGNIFICANT_THRESHOLD_PX ||
        Math.abs(newRect.height - lastRect.height) >
          RESIZE_SIGNIFICANT_THRESHOLD_PX

      if (!isSignificant) return

      // Debounce the actual state update to avoid jarring resets
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (readingAreaRef.current) {
          lastRectRef.current = { width: newRect.width, height: newRect.height }
          setContainerRect(readingAreaRef.current.getBoundingClientRect())
          setPoints([])
          setCurrentPointIndex(0)
          pointsInitializedRef.current = false
        }
      }, RESIZE_DEBOUNCE_MS)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(readingAreaRef.current)

    return () => {
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'intro' && phase !== 'requesting-camera') return

    if (webgazerStatus === 'ready') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with external status
      setPhase('calibrating')
    } else if (
      webgazerStatus === 'permission-denied' ||
      webgazerStatus === 'error' ||
      webgazerStatus === 'not-supported'
    ) {
      setPhase('failed')
    }
  }, [webgazerStatus, phase])

  const handleStartCalibration = useCallback(() => {
    if (webgazerStatus === 'ready') {
      setPhase('calibrating')
    } else {
      setPhase('requesting-camera')
    }
  }, [webgazerStatus])

  const handlePointClick = useCallback(() => {
    const now = Date.now()
    if (now - lastClickTimeRef.current < CALIBRATION_CLICK_DEBOUNCE_MS) return
    lastClickTimeRef.current = now

    const currentPoint = points[currentPointIndex]
    if (!currentPoint) return

    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current)
    }
    pendingTimeoutRef.current = setTimeout(() => {
      recordScreenPosition(currentPoint.x, currentPoint.y)
      pendingTimeoutRef.current = null
    }, CALIBRATION_CLICK_SETTLE_MS)

    const isLastClick = currentPoint.clicksRemaining <= 1
    const isLastPoint = currentPointIndex >= calibrationPositions.length - 1

    setPoints((prev) => {
      const updated = [...prev]
      if (isLastClick) {
        updated[currentPointIndex] = {
          ...updated[currentPointIndex],
          clicksRemaining: 0,
          isComplete: true,
        }
      } else {
        updated[currentPointIndex] = {
          ...updated[currentPointIndex],
          clicksRemaining: updated[currentPointIndex].clicksRemaining - 1,
        }
      }
      return updated
    })

    if (isLastClick) {
      if (isLastPoint) {
        setPhase('measuring-accuracy')
      } else {
        setCurrentPointIndex((prev) => prev + 1)
      }
    }
  }, [
    currentPointIndex,
    points,
    calibrationPositions.length,
    recordScreenPosition,
  ])

  const markComplete = useCallback(() => setPhase('complete'), [])

  return {
    phase,
    points,
    currentPointIndex,
    containerRect,
    readingAreaRef,
    handleStartCalibration,
    handlePointClick,
    markComplete,
    totalPoints,
  }
}

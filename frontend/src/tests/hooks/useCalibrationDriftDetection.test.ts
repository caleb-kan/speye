import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCalibrationDriftDetection } from '../../hooks/useCalibrationDriftDetection'

afterEach(() => vi.useRealTimers())

it('warns when tracking is unreliable from the start and clears after recovery', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
  const { result, rerender } = renderHook(
    ({ isReliable }) =>
      useCalibrationDriftDetection({
        isReliable,
        isReadingActive: true,
        isCalibrated: true,
      }),
    { initialProps: { isReliable: false } }
  )
  act(() => vi.advanceTimersByTime(10000))
  expect(result.current.status).toBe('poor')
  expect(result.current.shouldRecalibrate).toBe(true)
  rerender({ isReliable: true })
  act(() => vi.advanceTimersByTime(5000))
  expect(result.current.status).toBe('good')
  expect(result.current.shouldRecalibrate).toBe(false)
})

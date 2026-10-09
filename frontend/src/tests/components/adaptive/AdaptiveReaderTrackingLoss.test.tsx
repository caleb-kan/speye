import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { GazeData } from '../../../types/webgazer'

const state = vi.hoisted(() => ({
  onGaze: null as ((data: GazeData | null) => void) | null,
}))
vi.mock('../../../hooks/useWebGazer', () => ({
  useWebGazer: ({ onGaze }: { onGaze: (data: GazeData | null) => void }) => {
    state.onGaze = onGaze
    return {
      status: 'ready',
      isReady: true,
      error: null,
      recordScreenPosition: vi.fn(),
      clearData: vi.fn(),
    }
  },
}))
vi.mock('../../../hooks/useCalibration', () => ({
  useCalibration: () => ({
    state: { isCalibrated: true },
    completeCalibration: vi.fn(),
    failCalibration: vi.fn(),
  }),
}))

import { AdaptiveReader } from '../../../components/adaptive/AdaptiveReader'

afterEach(() => vi.useRealTimers())

it('shows tracking loss immediately when WebGazer loses the face', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
  render(
    <AdaptiveReader
      title="Article"
      text="one two three four"
      source={null}
      onNewText={vi.fn()}
    />
  )
  for (let i = 0; i < 8; i++) {
    act(() => {
      vi.advanceTimersByTime(50)
      state.onGaze?.({ x: 100, y: 100 })
    })
  }
  expect(screen.getByText('100%')).toBeInTheDocument()
  act(() => state.onGaze?.(null))
  expect(screen.getByText('Low confidence')).toBeInTheDocument()
  expect(screen.getByText('○ Not tracking')).toBeInTheDocument()
})

import { useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AdaptiveReader } from '../../../components/adaptive/AdaptiveReader'

vi.mock('../../../hooks/useWebGazer', () => ({
  useWebGazer: () => ({
    status: 'ready',
    isReady: true,
    error: null,
    recordScreenPosition: vi.fn(),
    clearData: vi.fn(),
  }),
}))
vi.mock('../../../hooks/useCalibration', () => ({
  useCalibration: () => ({
    state: { isCalibrated: true },
    completeCalibration: vi.fn(),
    failCalibration: vi.fn(),
  }),
}))
vi.mock('../../../components/adaptive/SingleLineTextDisplay', () => ({
  SingleLineTextDisplay: ({
    text,
    onTotalChunksCalculated,
    onChunkWordCounts,
  }: {
    text: string
    onTotalChunksCalculated: (count: number) => void
    onChunkWordCounts: (counts: number[]) => void
  }) => {
    useEffect(() => {
      onTotalChunksCalculated(2)
      onChunkWordCounts([1, 1])
    }, [text, onTotalChunksCalculated, onChunkWordCounts])
    return <div>{text}</div>
  },
}))

it.each(['three four', 'one two'])(
  'keeps completion isolated when the final section contains "%s"',
  (lastContent) => {
    const onComplete = vi.fn()
    const onSectionComplete = vi.fn()
    const onSectionIndexChange = vi.fn()
    const onRestart = vi.fn()
    render(
      <AdaptiveReader
        title={null}
        text={`one two\n\n---\n\n${lastContent}`}
        source={null}
        onNewText={vi.fn()}
        sectional
        section_content={[
          { title: 'First', content: 'one two' },
          { title: 'Last', content: lastContent },
        ]}
        onComplete={onComplete}
        onSectionComplete={onSectionComplete}
        onSectionIndexChange={onSectionIndexChange}
        onRestart={onRestart}
      />
    )
    const forward = () =>
      act(() =>
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
        )
      )
    forward()
    forward()
    expect(onSectionComplete).toHaveBeenLastCalledWith(0)
    expect(onSectionIndexChange).toHaveBeenLastCalledWith(0)
    fireEvent.click(screen.getByText('Skip Section'))
    expect(screen.getByText(lastContent)).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalledWith(true)
    forward()
    forward()
    expect(onSectionIndexChange).toHaveBeenLastCalledWith(1)
    expect(onComplete).toHaveBeenLastCalledWith(true)
    expect(onRestart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Restart reading' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(onSectionIndexChange).toHaveBeenLastCalledWith(0)
    expect(onComplete).toHaveBeenLastCalledWith(false)
  }
)

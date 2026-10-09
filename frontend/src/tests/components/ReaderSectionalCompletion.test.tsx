import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Reader } from '../../components/Reader'

vi.mock('../../components/TextDisplay', () => ({ TextDisplay: () => <div /> }))
vi.mock('../../components/Resizable', () => ({
  Resizable: ({ children }: { children: React.ReactNode }) => children,
}))

afterEach(() => vi.useRealTimers())

it('completes at the final section word without timing hidden separators', () => {
  vi.useFakeTimers()
  const onComplete = vi.fn()
  const onPositionChange = vi.fn()
  render(
    <Reader
      title={null}
      text={'one two\n\n---\n\nthree four'}
      source={null}
      wpm={300}
      scrolling="dynamic"
      blurEnabled={false}
      onNewText={vi.fn()}
      textWidthPercent={100}
      onTextWidthChange={vi.fn()}
      visibleLines={3}
      sectional
      section_content={[
        { title: 'First', content: 'one two' },
        { title: 'Last', content: 'three four' },
      ]}
      initialWordIndex={2}
      onComplete={onComplete}
      onPositionChange={onPositionChange}
    />
  )
  fireEvent.click(screen.getByLabelText('Play'))
  act(() => vi.advanceTimersByTime(200))
  expect(
    screen.getByText(/2\s*\/\s*2 words.*100.*of section complete/)
  ).toBeInTheDocument()
  expect(onPositionChange).toHaveBeenLastCalledWith(3)
  expect(onComplete).toHaveBeenLastCalledWith(true)
})

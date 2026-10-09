import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PvpQueueOverlay } from '../../components/pvp/lobby/PvpQueueOverlay'

describe('queue cancellation accessibility', () => {
  it('keeps keyboard focus inside the dialog while its cancel button is disabled', () => {
    render(
      <PvpQueueOverlay visible queueTime={4} canceling onCancel={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Leaving queue...')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    fireEvent(window, tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})

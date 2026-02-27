import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isDestructive: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('displays the title', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('displays the message', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(
      screen.getByText('Are you sure you want to proceed?')
    ).toBeInTheDocument()
  })

  it('displays custom confirm label', () => {
    render(
      <ConfirmDialog {...defaultProps} confirmLabel="Delete Permanently" />
    )
    expect(
      screen.getByTestId('confirm-dialog-confirm-button')
    ).toHaveTextContent('Delete Permanently')
  })

  it('displays custom cancel label', () => {
    render(<ConfirmDialog {...defaultProps} cancelLabel="Keep It" />)
    expect(
      screen.getByTestId('confirm-dialog-cancel-button')
    ).toHaveTextContent('Keep It')
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button')
    await user.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel-button')
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when escape key is pressed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog {...defaultProps} isOpen={true} onCancel={onCancel} />
    )

    const backdrop = screen.getByTestId('confirm-dialog')
    await user.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCancel when content is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    const message = screen.getByText('Are you sure you want to proceed?')
    await user.click(message)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('displays error icon when isDestructive is true', () => {
    render(<ConfirmDialog {...defaultProps} isDestructive={true} />)
    const iconDiv = screen.getByTestId('confirm-dialog-error-icon')
    expect(iconDiv).toBeInTheDocument()
  })

  it('does not display error icon when isDestructive is false', () => {
    render(<ConfirmDialog {...defaultProps} isDestructive={false} />)
    expect(
      screen.queryByTestId('confirm-dialog-error-icon')
    ).not.toBeInTheDocument()
  })

  it('has alertdialog role for accessibility', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={true} />)
    const dialog = screen.getByTestId('confirm-dialog')
    expect(dialog).toHaveAttribute('role', 'alertdialog')
  })

  it('has aria-modal attribute set to true', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={true} />)
    const dialog = screen.getByTestId('confirm-dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has aria-labelledby and aria-describedby for accessibility', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={true} />)
    const dialog = screen.getByTestId('confirm-dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message')
  })

  it('applies error styling when isDestructive is true', () => {
    render(<ConfirmDialog {...defaultProps} isDestructive={true} />)
    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button')
    expect(confirmBtn.className).toContain('bg-error')
  })

  it('applies primary styling when isDestructive is false', () => {
    render(<ConfirmDialog {...defaultProps} isDestructive={false} />)
    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button')
    expect(confirmBtn.className).toContain('bg-primary')
  })
})

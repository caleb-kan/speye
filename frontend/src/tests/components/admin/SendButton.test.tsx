import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendButton } from '../../../components/admin/notificationCreator/SendButton'

describe('SendButton', () => {
  const defaultProps = {
    sending: false,
    canSend: true,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render "Send Notification" text by default', () => {
    render(<SendButton {...defaultProps} />)
    expect(screen.getByText('Send Notification')).toBeInTheDocument()
  })

  it('should render "Dispatching..." text when sending', () => {
    render(<SendButton {...defaultProps} sending={true} />)
    expect(screen.getByText('Dispatching...')).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup()
    render(<SendButton {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(defaultProps.onClick).toHaveBeenCalled()
  })

  it('should be disabled when canSend is false', () => {
    render(<SendButton {...defaultProps} canSend={false} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should be enabled when canSend is true', () => {
    render(<SendButton {...defaultProps} canSend={true} />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})

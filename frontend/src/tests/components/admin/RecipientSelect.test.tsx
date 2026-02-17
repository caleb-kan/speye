import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipientSelect } from '../../../components/admin/notificationCreator/RecipientSelect'
import { BROADCAST_VALUE } from '../../../constants/admin'

const mockUsers = [
  { id: 'user-1', username: 'alice' },
  { id: 'user-2', username: 'bob' },
]

describe('RecipientSelect', () => {
  const defaultProps = {
    users: mockUsers,
    recipient: '',
    isBroadcast: false,
    sending: false,
    onRecipientChange: vi.fn(),
    onBroadcastChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label and select', () => {
    render(<RecipientSelect {...defaultProps} />)
    expect(screen.getByText(/Recipient/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should render all user options', () => {
    render(<RecipientSelect {...defaultProps} />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('should render broadcast option', () => {
    render(<RecipientSelect {...defaultProps} />)
    expect(screen.getByText('📡 Broadcast to All Users')).toBeInTheDocument()
  })

  it('should call onRecipientChange when a user is selected', async () => {
    const user = userEvent.setup()
    render(<RecipientSelect {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox'), 'user-1')

    expect(defaultProps.onRecipientChange).toHaveBeenCalledWith('user-1')
    expect(defaultProps.onBroadcastChange).toHaveBeenCalledWith(false)
  })

  it('should call onBroadcastChange when broadcast is selected', async () => {
    const user = userEvent.setup()
    render(<RecipientSelect {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox'), BROADCAST_VALUE)

    expect(defaultProps.onBroadcastChange).toHaveBeenCalledWith(true)
    expect(defaultProps.onRecipientChange).toHaveBeenCalledWith('')
  })

  it('should show broadcast hint when isBroadcast is true', () => {
    render(<RecipientSelect {...defaultProps} isBroadcast={true} />)
    expect(screen.getByText(/Sending to 2 users/)).toBeInTheDocument()
  })

  it('should not show broadcast hint when isBroadcast is false', () => {
    render(<RecipientSelect {...defaultProps} isBroadcast={false} />)
    expect(screen.queryByText(/Sending to/)).not.toBeInTheDocument()
  })

  it('should disable select when sending is true', () => {
    render(<RecipientSelect {...defaultProps} sending={true} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

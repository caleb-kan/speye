import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '../../../components/admin/notificationCreator/MessageInput'

describe('MessageInput', () => {
  const defaultProps = {
    value: '',
    disabled: false,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label and textarea', () => {
    render(<MessageInput {...defaultProps} />)

    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('should render placeholder text', () => {
    render(<MessageInput {...defaultProps} />)

    expect(
      screen.getByPlaceholderText('Enter notification message...')
    ).toBeInTheDocument()
  })

  it('should display the current value', () => {
    render(<MessageInput {...defaultProps} value="Hello world" />)

    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement
    expect(textarea.value).toBe('Hello world')
  })

  it('should call onChange when text is typed', async () => {
    const user = userEvent.setup()
    render(<MessageInput {...defaultProps} />)

    await user.type(screen.getByLabelText('Message'), 'Hi')

    expect(defaultProps.onChange).toHaveBeenCalledWith('H')
    expect(defaultProps.onChange).toHaveBeenCalledWith('i')
  })

  it('should disable textarea when disabled prop is true', () => {
    render(<MessageInput {...defaultProps} disabled={true} />)

    expect(screen.getByLabelText('Message')).toBeDisabled()
  })
})

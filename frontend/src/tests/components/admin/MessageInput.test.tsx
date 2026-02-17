import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '../../../components/admin/notificationCreator/MessageInput'

describe('MessageInput', () => {
  const defaultProps = {
    value: '',
    sending: false,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label and textarea', () => {
    render(<MessageInput {...defaultProps} />)
    expect(screen.getByText('Message')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render placeholder text', () => {
    render(<MessageInput {...defaultProps} />)
    expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument()
  })

  it('should display the current value', () => {
    render(<MessageInput {...defaultProps} value="Hello world" />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('Hello world')
  })

  it('should call onChange when text is typed', async () => {
    const user = userEvent.setup()
    render(<MessageInput {...defaultProps} />)

    await user.type(screen.getByRole('textbox'), 'Hi')

    expect(defaultProps.onChange).toHaveBeenCalledWith('H')
    expect(defaultProps.onChange).toHaveBeenCalledWith('i')
  })

  it('should disable textarea when sending is true', () => {
    render(<MessageInput {...defaultProps} sending={true} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

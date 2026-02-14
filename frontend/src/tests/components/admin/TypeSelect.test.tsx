import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeSelect } from '../../../components/admin/notificationCreator/TypeSelect'

describe('TypeSelect', () => {
  const defaultProps = {
    value: 'info' as const,
    disabled: false,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label and select', () => {
    render(<TypeSelect {...defaultProps} />)

    expect(screen.getByLabelText('Notification Type')).toBeInTheDocument()
  })

  it('should render all notification type options', () => {
    render(<TypeSelect {...defaultProps} />)

    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should have the correct value selected', () => {
    render(<TypeSelect {...defaultProps} value="alert" />)

    const select = screen.getByLabelText(
      'Notification Type'
    ) as HTMLSelectElement
    expect(select.value).toBe('alert')
  })

  it('should call onChange when a type is selected', async () => {
    const user = userEvent.setup()
    render(<TypeSelect {...defaultProps} />)

    await user.selectOptions(
      screen.getByLabelText('Notification Type'),
      'error'
    )

    expect(defaultProps.onChange).toHaveBeenCalledWith('error')
  })

  it('should disable select when disabled prop is true', () => {
    render(<TypeSelect {...defaultProps} disabled={true} />)

    expect(screen.getByLabelText('Notification Type')).toBeDisabled()
  })
})

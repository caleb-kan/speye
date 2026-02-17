import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeSelect } from '../../../components/admin/notificationCreator/TypeSelect'

describe('TypeSelect', () => {
  const defaultProps = {
    value: 'info' as const,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label and type buttons', () => {
    render(<TypeSelect {...defaultProps} />)
    expect(screen.getByText(/Notification Type/i)).toBeInTheDocument()
    // Check for buttons instead of select options
    expect(screen.getByRole('button', { name: /Info/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alert/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Error/i })).toBeInTheDocument()
  })

  it('should call onChange when a type button is clicked', async () => {
    const user = userEvent.setup()
    render(<TypeSelect {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /Error/i }))

    expect(defaultProps.onChange).toHaveBeenCalledWith('error')
  })

  it('should indicate active state visually', () => {
    render(<TypeSelect {...defaultProps} value="alert" />)

    const alertBtn = screen.getByRole('button', { name: /Alert/i })
    expect(alertBtn.className).toContain('text-primary')

    const infoBtn = screen.getByRole('button', { name: /Info/i })
    expect(infoBtn.className).not.toContain('text-primary')
  })
})

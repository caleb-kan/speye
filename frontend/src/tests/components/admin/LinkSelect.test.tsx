import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkSelect } from '../../../components/admin/notificationCreator/LinkSelect'

const mockLinks = [
  { value: '', label: 'None' },
  { value: '/home', label: 'Home' },
  { value: '/library', label: 'Library' },
  { value: '/admin', label: 'Admin', adminOnly: true },
]

describe('LinkSelect', () => {
  const defaultProps = {
    value: '',
    disabled: false,
    availableLinks: mockLinks,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label with optional hint', () => {
    render(<LinkSelect {...defaultProps} />)

    expect(screen.getByText('Link')).toBeInTheDocument()
    expect(screen.getByText('(optional)')).toBeInTheDocument()
  })

  it('should render all available link options', () => {
    render(<LinkSelect {...defaultProps} />)

    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should have the correct value selected', () => {
    render(<LinkSelect {...defaultProps} value="/library" />)

    const select = screen.getByLabelText('Link') as HTMLSelectElement
    expect(select.value).toBe('/library')
  })

  it('should call onChange when a link is selected', async () => {
    const user = userEvent.setup()
    render(<LinkSelect {...defaultProps} />)

    await user.selectOptions(screen.getByLabelText('Link'), '/home')

    expect(defaultProps.onChange).toHaveBeenCalledWith('/home')
  })

  it('should disable select when disabled prop is true', () => {
    render(<LinkSelect {...defaultProps} disabled={true} />)

    expect(screen.getByLabelText('Link')).toBeDisabled()
  })

  it('should only show filtered links when admin links are excluded', () => {
    const nonAdminLinks = mockLinks.filter((l) => !l.adminOnly)
    render(<LinkSelect {...defaultProps} availableLinks={nonAdminLinks} />)

    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })
})

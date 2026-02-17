import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPromotion } from '../../components/admin/AdminPromotion'

type AdminPromotionMockState = {
  loadingUsers: boolean
  searchQuery: string
  selectedUserId: string | null
  selectedUserLabel: string | null
  filteredUsers: Array<{ id: string; username: string | null }>
  promoting: boolean
  successMessage: string | null
  error: string | null
}

const { mockState, mockSetters } = vi.hoisted(() => {
  const mockState: AdminPromotionMockState = {
    loadingUsers: false,
    searchQuery: '',
    selectedUserId: null,
    selectedUserLabel: null,
    filteredUsers: [
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
      { id: 'admin-user-3', username: 'admin' },
    ],
    promoting: false,
    successMessage: null,
    error: null,
  }

  const mockSetters = {
    setSearchQuery: vi.fn(),
    setSelectedUserId: vi.fn(),
    setSuccessMessage: vi.fn(),
    handlePromote: vi.fn(),
  }

  return { mockState, mockSetters }
})

vi.mock('../../hooks/useAdminPromotion', () => ({
  useAdminPromotion: () => ({
    ...mockState,
    ...mockSetters,

    setSearchQuery: (val: string) => {
      mockState.searchQuery = val
      mockSetters.setSearchQuery(val)
    },
    setSelectedUserId: (val: string | null) => {
      mockState.selectedUserId = val
      mockSetters.setSelectedUserId(val)
    },
  }),
}))

vi.mock('../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

describe('AdminPromotion', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
    })

    vi.clearAllMocks()
    cleanup()

    mockState.loadingUsers = false
    mockState.searchQuery = ''
    mockState.selectedUserId = null
    mockState.selectedUserLabel = null
    mockState.filteredUsers = [
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
      { id: 'admin-user-3', username: 'admin' },
    ]
    mockState.promoting = false
    mockState.successMessage = null
    mockState.error = null

    mockSetters.handlePromote.mockResolvedValue(true)
  })

  it('should render search input', () => {
    render(<AdminPromotion />)
    expect(
      screen.getByPlaceholderText('Search by username...')
    ).toBeInTheDocument()
  })

  it('should render description text', () => {
    render(<AdminPromotion />)
    expect(
      screen.getByText(
        'Search for a user by ID to upgrade their privileges to Administrator status.'
      )
    ).toBeInTheDocument()
  })

  it('should show dropdown on focus', async () => {
    mockState.searchQuery = 'user'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by username...')

    // Type something to trigger the "searchQuery" condition
    await user.type(input, 'user')

    expect(screen.getByText('alice')).toBeInTheDocument()
    // expect(screen.getByText('bob')).toBeInTheDocument()
    // expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('should show Selection Card when user is selected', () => {
    mockState.selectedUserId = 'user-1'
    mockState.selectedUserLabel = 'alice'
    render(<AdminPromotion />)

    expect(screen.getByText('Selected User')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Grant Admin Access/i })
    ).toBeInTheDocument()
  })

  it('should NOT show Selection Card when no user is selected', () => {
    render(<AdminPromotion />)
    expect(screen.queryByText('Selected User')).not.toBeInTheDocument()
  })

  it('should show inline confirmation on Grant Admin click', async () => {
    mockState.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(
      screen.getByRole('button', { name: /Grant Admin Access/i })
    )

    expect(screen.getByText('Confirm Promotion')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('should call handlePromote on confirm', async () => {
    mockState.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(
      screen.getByRole('button', { name: /Grant Admin Access/i })
    )
    await user.click(screen.getByRole('button', { name: /Confirm/i }))

    expect(mockSetters.handlePromote).toHaveBeenCalledOnce()
  })

  it('should dismiss confirmation on cancel', async () => {
    mockState.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(
      screen.getByRole('button', { name: /Grant Admin Access/i })
    )
    expect(screen.getByText('Confirm Promotion')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(screen.queryByText('Confirm Promotion')).not.toBeInTheDocument()
  })

  it('should show success message', () => {
    mockState.successMessage = 'User promoted successfully'
    render(<AdminPromotion />)
    expect(screen.getByText('User promoted successfully')).toBeInTheDocument()
  })

  it('should show error message', () => {
    mockState.error = 'Failed to promote user'
    render(<AdminPromotion />)
    expect(screen.getByText('Failed to promote user')).toBeInTheDocument()
  })

  it('should disable input when promoting', () => {
    mockState.promoting = true
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by username...')
    expect(input).toBeDisabled()
  })

  it('should show no users found when filtered list is empty', async () => {
    mockState.filteredUsers = []
    mockState.searchQuery = 'unknown' // Ensure query is set so dropdown opens

    const user = userEvent.setup()
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by username...')

    // Type to trigger focus + query
    await user.type(input, 'unknown')

    expect(screen.getByText('No users found.')).toBeInTheDocument()
  })
})

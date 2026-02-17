import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPromotion } from '../../components/admin/adminPromotion/AdminPromotion'

const mockHandlePromote = vi.fn()
const mockSetSearchQuery = vi.fn()
const mockSetSelectedUserId = vi.fn()
const mockSetSuccessMessage = vi.fn()

let mockHookReturn = {
  loadingUsers: false,
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  selectedUserId: null as string | null,
  setSelectedUserId: mockSetSelectedUserId,
  filteredUsers: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'admin-user-3' }],
  promoting: false,
  successMessage: null as string | null,
  setSuccessMessage: mockSetSuccessMessage,
  error: null as string | null,

  handlePromote: mockHandlePromote,
}

vi.mock('../../hooks/useAdminPromotion', () => ({
  useAdminPromotion: () => mockHookReturn,
}))

vi.mock('../../hooks/useAutoClearMessage', () => ({
  useAutoClearMessage: vi.fn(),
}))

describe('AdminPromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandlePromote.mockResolvedValue(true)
    mockHookReturn = {
      loadingUsers: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedUserId: null,
      setSelectedUserId: mockSetSelectedUserId,
      filteredUsers: [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'admin-user-3' },
      ],
      promoting: false,
      successMessage: null,
      setSuccessMessage: mockSetSuccessMessage,
      error: null,

      handlePromote: mockHandlePromote,
    }
  })

  it('should render search input', () => {
    render(<AdminPromotion />)
    expect(
      screen.getByPlaceholderText('Search by user ID...')
    ).toBeInTheDocument()
  })

  it('should render search label', () => {
    render(<AdminPromotion />)
    expect(screen.getByText('Search User')).toBeInTheDocument()
  })

  it('should show dropdown on focus', async () => {
    const user = userEvent.setup()
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by user ID...')
    await user.click(input)

    expect(screen.getByText('user-1')).toBeInTheDocument()
    expect(screen.getByText('user-2')).toBeInTheDocument()
    expect(screen.getByText('admin-user-3')).toBeInTheDocument()
  })

  it('should show Grant Admin button when user is selected', () => {
    mockHookReturn.selectedUserId = 'user-1'
    render(<AdminPromotion />)

    expect(screen.getByText('Grant Admin Role')).toBeInTheDocument()
  })

  it('should not show Grant Admin button when no user is selected', () => {
    render(<AdminPromotion />)
    expect(screen.queryByText('Grant Admin Role')).not.toBeInTheDocument()
  })

  it('should show confirmation dialog on Grant Admin click', async () => {
    mockHookReturn.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(screen.getByText('Grant Admin Role'))

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Grant Admin Privileges')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call handlePromote on confirm', async () => {
    mockHookReturn.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(screen.getByText('Grant Admin Role'))
    await user.click(screen.getByText('Confirm'))

    expect(mockHandlePromote).toHaveBeenCalledOnce()
  })

  it('should dismiss dialog after successful promotion', async () => {
    mockHandlePromote.mockResolvedValue(true)
    mockHookReturn.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(screen.getByText('Grant Admin Role'))
    await user.click(screen.getByText('Confirm'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('should keep dialog open after failed promotion', async () => {
    mockHandlePromote.mockResolvedValue(false)
    mockHookReturn.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(screen.getByText('Grant Admin Role'))
    await user.click(screen.getByText('Confirm'))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('should dismiss dialog on cancel', async () => {
    mockHookReturn.selectedUserId = 'user-1'
    const user = userEvent.setup()
    render(<AdminPromotion />)

    await user.click(screen.getByText('Grant Admin Role'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('should show success message', () => {
    mockHookReturn.successMessage = 'User promoted successfully'
    render(<AdminPromotion />)

    expect(screen.getByText('User promoted successfully')).toBeInTheDocument()
  })

  it('should show error message', () => {
    mockHookReturn.error = 'Failed to promote user'
    render(<AdminPromotion />)

    expect(screen.getByText('Failed to promote user')).toBeInTheDocument()
  })

  it('should show loading state for users', () => {
    mockHookReturn.loadingUsers = true
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by user ID...')
    expect(input).toBeDisabled()
  })

  it('should show no users found when filtered list is empty', async () => {
    mockHookReturn.filteredUsers = []
    mockHookReturn.loadingUsers = false
    const user = userEvent.setup()
    render(<AdminPromotion />)

    const input = screen.getByPlaceholderText('Search by user ID...')
    await user.click(input)

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })
})

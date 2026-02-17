import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireUsername } from '../../components/auth/RequireUsername'
import '@testing-library/jest-dom'

const mockUseAuth = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithRouter(initialPath = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireUsername />}>
          <Route path="/home" element={<div>Home Page</div>} />
          <Route path="/library" element={<div>Library Page</div>} />
        </Route>
        <Route path="/complete-profile" element={<div>Complete Profile</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireUsername', () => {
  it('renders nothing while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })

    const { container } = renderWithRouter()

    expect(container.innerHTML).toBe('')
  })

  it('renders child route for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })

    renderWithRouter()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })

  it('redirects to /complete-profile when user has no username', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', user_metadata: {} },
      loading: false,
    })

    renderWithRouter()

    expect(screen.getByText('Complete Profile')).toBeInTheDocument()
  })

  it('renders child route when user has a username', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', user_metadata: { username: 'alice' } },
      loading: false,
    })

    renderWithRouter()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })

  it('redirects from any protected route when username is missing', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', user_metadata: {} },
      loading: false,
    })

    renderWithRouter('/library')

    expect(screen.getByText('Complete Profile')).toBeInTheDocument()
  })
})

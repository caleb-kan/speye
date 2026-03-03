import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LibraryHeader } from '../../../components/library/LibraryHeader'

vi.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

describe('LibraryHeader', () => {
  const mockOnUpload = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show upload button when showUpload is true', () => {
    render(
      <LibraryHeader
        activeTab="private"
        showUpload={true}
        onUpload={mockOnUpload}
      />
    )

    expect(
      screen.getByRole('button', { name: /Upload Text/i })
    ).toBeInTheDocument()
  })

  it('should hide upload button when showUpload is false', () => {
    render(
      <LibraryHeader
        activeTab="public"
        showUpload={false}
        onUpload={mockOnUpload}
      />
    )

    expect(
      screen.queryByRole('button', { name: /Upload Text/i })
    ).not.toBeInTheDocument()
  })

  it('should call onUpload when upload button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <LibraryHeader
        activeTab="private"
        showUpload={true}
        onUpload={mockOnUpload}
      />
    )

    await user.click(screen.getByRole('button', { name: /Upload Text/i }))

    expect(mockOnUpload).toHaveBeenCalledTimes(1)
  })

  it('should show private tab subtitle', () => {
    render(
      <LibraryHeader
        activeTab="private"
        showUpload={false}
        onUpload={mockOnUpload}
      />
    )

    expect(screen.getByText('Your personal text library')).toBeInTheDocument()
  })

  it('should show public tab subtitle', () => {
    render(
      <LibraryHeader
        activeTab="public"
        showUpload={false}
        onUpload={mockOnUpload}
      />
    )

    expect(screen.getByText('Browse public texts')).toBeInTheDocument()
  })
})

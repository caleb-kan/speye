import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DefaultAvatar } from '../../components/DefaultAvatar'

describe('DefaultAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<DefaultAvatar />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays image when avatarUrl is provided and loads', () => {
    render(
      <DefaultAvatar
        avatarUrl="https://example.com/avatar.jpg"
        username="testuser"
      />
    )
    const img = screen.getByTestId('avatar-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('shows initial letter from username', () => {
    render(<DefaultAvatar username="john" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar).toHaveTextContent('J')
  })

  it('shows question mark when no username provided', () => {
    render(<DefaultAvatar />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar).toHaveTextContent('?')
  })

  it('has correct aria-label with username', () => {
    render(<DefaultAvatar username="jane" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar).toHaveAccessibleName(/Avatar for jane/)
  })

  it('has correct aria-label without username', () => {
    render(<DefaultAvatar />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar).toHaveAccessibleName('Default avatar')
  })

  it('falls back to colored circle when image fails to load', async () => {
    const { rerender } = render(
      <DefaultAvatar
        avatarUrl="https://example.com/invalid.jpg"
        username="testuser"
      />
    )

    const img = screen.getByTestId('avatar-image')
    // Simulate image load error wrapped in act() for state updates
    await act(async () => {
      img.dispatchEvent(new Event('error'))
    })

    rerender(
      <DefaultAvatar
        avatarUrl="https://example.com/invalid.jpg"
        username="testuser"
      />
    )

    expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument()
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('T')
  })

  it('applies sm size class', () => {
    render(<DefaultAvatar size="sm" username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('text-sm')
  })

  it('applies md size class', () => {
    render(<DefaultAvatar size="md" username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('text-base')
  })

  it('applies lg size class', () => {
    render(<DefaultAvatar size="lg" username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('text-3xl')
  })

  it('defaults to md size', () => {
    render(<DefaultAvatar username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('text-base')
  })

  it('generates consistent color from username', () => {
    const { rerender } = render(<DefaultAvatar username="testuser" />)
    const avatar1 = screen.getByTestId('avatar-fallback')
    const style1 = avatar1.getAttribute('style')

    rerender(<DefaultAvatar username="testuser" />)
    const avatar2 = screen.getByTestId('avatar-fallback')
    const style2 = avatar2.getAttribute('style')

    // Same username should produce same color
    expect(style1).toContain(style2?.match(/hsl\([^)]+\)/)?.[0] || '')
  })

  it('generates different colors from different usernames', () => {
    const { rerender } = render(<DefaultAvatar username="user1" />)
    const avatar1 = screen.getByTestId('avatar-fallback')
    const style1 = avatar1.getAttribute('style')

    rerender(<DefaultAvatar username="user2" />)
    const avatar2 = screen.getByTestId('avatar-fallback')
    const style2 = avatar2.getAttribute('style')

    // Different usernames likely produce different colors
    expect(style1).not.toEqual(style2)
  })

  it('has rounded-full class', () => {
    render(<DefaultAvatar username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('rounded-full')
  })

  it('has w-full h-full classes for filling parent', () => {
    render(<DefaultAvatar username="testuser" />)
    const avatar = screen.getByTestId('avatar-fallback')
    expect(avatar.className).toContain('w-full')
    expect(avatar.className).toContain('h-full')
  })

  it('sets referrerPolicy for image', () => {
    render(<DefaultAvatar avatarUrl="https://example.com/avatar.jpg" />)
    const img = screen.getByTestId('avatar-image')
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer')
  })
})

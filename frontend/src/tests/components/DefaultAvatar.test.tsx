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
        email="test@example.com"
      />
    )
    const img = screen.getByAltText(/Avatar for test@example.com/)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('shows initial letter from email', () => {
    render(<DefaultAvatar email="john@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveTextContent('J')
  })

  it('shows question mark when no email provided', () => {
    render(<DefaultAvatar />)
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveTextContent('?')
  })

  it('has correct aria-label with email', () => {
    render(<DefaultAvatar email="jane@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAccessibleName(/Avatar for jane@example.com/)
  })

  it('has correct aria-label without email', () => {
    render(<DefaultAvatar />)
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAccessibleName('Default avatar')
  })

  it('falls back to colored circle when image fails to load', async () => {
    const { rerender } = render(
      <DefaultAvatar
        avatarUrl="https://example.com/invalid.jpg"
        email="test@example.com"
      />
    )

    const img = screen.getByAltText(/Avatar for test@example.com/)
    // Simulate image load error wrapped in act() for state updates
    await act(async () => {
      img.dispatchEvent(new Event('error'))
    })

    rerender(
      <DefaultAvatar
        avatarUrl="https://example.com/invalid.jpg"
        email="test@example.com"
      />
    )

    expect(
      screen.queryByAltText(/Avatar for test@example.com/)
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent('T')
  })

  it('applies sm size class', () => {
    render(<DefaultAvatar size="sm" email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('text-sm')
  })

  it('applies md size class', () => {
    render(<DefaultAvatar size="md" email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('text-base')
  })

  it('applies lg size class', () => {
    render(<DefaultAvatar size="lg" email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('text-3xl')
  })

  it('defaults to md size', () => {
    render(<DefaultAvatar email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('text-base')
  })

  it('generates consistent color from email', () => {
    const { rerender } = render(<DefaultAvatar email="test@example.com" />)
    const avatar1 = screen.getByRole('img')
    const style1 = avatar1.getAttribute('style')

    rerender(<DefaultAvatar email="test@example.com" />)
    const avatar2 = screen.getByRole('img')
    const style2 = avatar2.getAttribute('style')

    // Same email should produce same color
    expect(style1).toContain(style2?.match(/hsl\([^)]+\)/)?.[0] || '')
  })

  it('generates different colors from different emails', () => {
    const { rerender } = render(<DefaultAvatar email="test1@example.com" />)
    const avatar1 = screen.getByRole('img')
    const style1 = avatar1.getAttribute('style')

    rerender(<DefaultAvatar email="test2@example.com" />)
    const avatar2 = screen.getByRole('img')
    const style2 = avatar2.getAttribute('style')

    // Different emails likely produce different colors
    expect(style1).not.toEqual(style2)
  })

  it('has rounded-full class', () => {
    render(<DefaultAvatar email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('rounded-full')
  })

  it('has w-full h-full classes for filling parent', () => {
    render(<DefaultAvatar email="test@example.com" />)
    const avatar = screen.getByRole('img')
    expect(avatar.className).toContain('w-full')
    expect(avatar.className).toContain('h-full')
  })

  it('sets referrerPolicy for image', () => {
    render(<DefaultAvatar avatarUrl="https://example.com/avatar.jpg" />)
    const img = screen.getByAltText('User avatar')
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer')
  })
})

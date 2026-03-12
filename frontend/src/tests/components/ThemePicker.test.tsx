import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemePicker } from '../../components/ThemePicker'
import '@testing-library/jest-dom'

const mockSetTheme = vi.fn()

const mockThemes = [
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#1a1a2e',
      bgSecondary: '#16213e',
      text: '#edf2f4',
      textSecondary: '#8d99ae',
      primary: '#e94560',
      error: '#ff6b6b',
      warning: '#eab308',
      success: '#4ecdc4',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      bg: '#282a36',
      bgSecondary: '#44475a',
      text: '#f8f8f2',
      textSecondary: '#6272a4',
      primary: '#bd93f9',
      error: '#ff5555',
      warning: '#f1fa8c',
      success: '#50fa7b',
    },
  },
]

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockThemes[0],
    themes: mockThemes,
    setTheme: mockSetTheme,
    loading: false,
  }),
}))

vi.mock('../../hooks/useEscapeKey', () => ({
  useEscapeKey: vi.fn(),
}))

describe('ThemePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the theme button', () => {
    render(<ThemePicker />)

    const button = screen.getByLabelText('Change theme')
    expect(button).toBeInTheDocument()
  })

  it('dropdown is closed by default', () => {
    render(<ThemePicker />)

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('opens dropdown on button click', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('closes dropdown on second button click', () => {
    render(<ThemePicker />)

    const button = screen.getByLabelText('Change theme')
    fireEvent.click(button)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('renders all themes in dropdown', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    expect(screen.getByLabelText('Midnight')).toBeInTheDocument()
    expect(screen.getByLabelText('Dracula')).toBeInTheDocument()
  })

  it('marks current theme as checked', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    expect(screen.getByLabelText('Midnight')).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByLabelText('Dracula')).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('calls setTheme when a theme is selected', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    fireEvent.click(screen.getByLabelText('Dracula'))
    expect(mockSetTheme).toHaveBeenCalledWith('dracula')
  })

  it('closes dropdown after selecting a theme', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    fireEvent.click(screen.getByLabelText('Dracula'))
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('sets aria-expanded correctly', () => {
    render(<ThemePicker />)

    const button = screen.getByLabelText('Change theme')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes dropdown on click outside', () => {
    render(<ThemePicker />)

    fireEvent.click(screen.getByLabelText('Change theme'))
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('displays theme favicon as button image', () => {
    render(<ThemePicker />)

    const img = screen.getByLabelText('Change theme').querySelector('img')
    expect(img).toHaveAttribute('src', '/favicons/alt/midnight.png')
  })
})

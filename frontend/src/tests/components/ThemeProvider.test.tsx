import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../context/ThemeProvider'
import { useTheme } from '../../hooks/useTheme'

function Probe() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme('light')}>{theme.id}</button>
}

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('theme storage failures', () => {
  it('loads the favicon under the Imperial deployment path', () => {
    const base = '/project/2025/60021/g256002102/web/'
    window.history.replaceState({}, '', `${base}settings`)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(icon?.getAttribute('href')).toMatch(`${base}favicons/`)
  })
  it('renders and applies theme changes when browser storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByRole('button')).toHaveTextContent('midnight')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('light')
    expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe(
      '#fafafa'
    )
  })
})

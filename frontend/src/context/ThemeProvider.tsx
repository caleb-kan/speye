import { useEffect, useState } from 'react'
import type { Theme } from '../lib/themes'
import { getThemeById, themes } from '../lib/themes'
import { ThemeContext } from './themeContext'
import { STORAGE_KEYS } from '../constants/storage'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE)
    return stored ? getThemeById(stored) : themes[0]
  })

  const [loading, setLoading] = useState(true)

  const setTheme = (id: string) => {
    const newTheme = getThemeById(id)
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, id)
  }

  useEffect(() => {
    const applyTheme = async () => {
      setLoading(true)
      const root = document.documentElement
      root.style.setProperty('--color-bg', theme.colors.bg)
      root.style.setProperty('--color-bg-secondary', theme.colors.bgSecondary)
      root.style.setProperty('--color-text', theme.colors.text)
      root.style.setProperty(
        '--color-text-secondary',
        theme.colors.textSecondary
      )
      root.style.setProperty('--color-primary', theme.colors.primary)
      root.style.setProperty('--color-error', theme.colors.error)
      root.style.setProperty('--color-warning', theme.colors.warning)
      root.style.setProperty('--color-success', theme.colors.success)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme.colors.bg)
      setLoading(false)
    }
    applyTheme()
  }, [theme])

  // Don't render children until theme is applied (avoids flash of content with incorrect theme)
  if (loading) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, loading }}>
      {children}
    </ThemeContext.Provider>
  )
}

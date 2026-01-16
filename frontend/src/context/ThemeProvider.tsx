import { useEffect, useState } from 'react'
import type { Theme } from '../lib/themes'
import { getThemeById, themes } from '../lib/themes'
import { ThemeContext } from './themeContext'

const THEME_STORAGE_KEY = 'speye-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored ? getThemeById(stored) : themes[0]
  })

  const setTheme = (id: string) => {
    const newTheme = getThemeById(id)
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, id)
  }

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-bg', theme.colors.bg)
    root.style.setProperty('--color-bg-secondary', theme.colors.bgSecondary)
    root.style.setProperty('--color-text', theme.colors.text)
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--color-primary', theme.colors.primary)
    root.style.setProperty('--color-error', theme.colors.error)
    root.style.setProperty('--color-success', theme.colors.success)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

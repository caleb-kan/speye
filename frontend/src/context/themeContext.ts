import { createContext } from 'react'
import type { Theme } from '../lib/themes'

export type ThemeContextType = {
  theme: Theme
  setTheme: (id: string) => void
  themes: Theme[]
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

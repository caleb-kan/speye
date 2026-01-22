import { useContext } from 'react'
import { ReadingPreferencesContext } from '../context/readingPreferencesContext'

export function useReadingPreferences() {
  const context = useContext(ReadingPreferencesContext)
  if (!context) {
    throw new Error(
      'useReadingPreferences must be used within a ReadingPreferencesProvider'
    )
  }
  return context
}

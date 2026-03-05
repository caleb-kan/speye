import { useEffect, useState } from 'react'
import { fetchLastReadDates } from '../services/libraryService'

export const useLibraryLastReadDates = (
  userId: string | null
): Record<string, string> => {
  const [lastReadDates, setLastReadDates] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function fetch() {
      try {
        const dates = await fetchLastReadDates(userId!)
        if (!cancelled) {
          setLastReadDates(dates)
        }
      } catch (err) {
        console.error('Failed to fetch last read dates:', err)
      }
    }

    void fetch()

    return () => {
      cancelled = true
    }
  }, [userId])

  return lastReadDates
}

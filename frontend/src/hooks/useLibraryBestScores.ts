import { useEffect, useState } from 'react'
import type { LibraryTab } from '../components/library/LibraryTabs'
import { fetchTextBestScores } from '../services/libraryService'

export const useLibraryBestScores = (
  userId: string | null,
  activeTab: LibraryTab
): Record<string, number> => {
  const [bestScores, setBestScores] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!userId || activeTab !== 'private') return

    let cancelled = false

    async function fetchScores() {
      try {
        const scores = await fetchTextBestScores(userId!)
        if (!cancelled) {
          setBestScores(scores)
        }
      } catch (err) {
        console.error('Failed to fetch best scores:', err)
      }
    }

    void fetchScores()

    return () => {
      cancelled = true
    }
  }, [userId, activeTab])

  return bestScores
}

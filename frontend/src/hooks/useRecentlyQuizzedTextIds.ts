import { useEffect, useState } from 'react'
import { fetchRecentlyQuizzedTextIds } from '../services/libraryService'

export function useRecentlyQuizzedTextIds(
  userId: string | null
): string[] | undefined {
  const [ids, setIds] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function fetch() {
      try {
        const result = await fetchRecentlyQuizzedTextIds(userId!)
        if (!cancelled) {
          setIds(result)
        }
      } catch (err) {
        console.error('Failed to fetch recently quizzed text IDs:', err)
      }
    }

    void fetch()

    return () => {
      cancelled = true
    }
  }, [userId])

  return ids
}

import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getActiveGame } from '../services/pvpService'
import { PvpLobby } from '../components/pvp/lobby/PvpLobby'
import {
  PvpLoadingSpinner,
  PvpLoginRequired,
} from '../components/pvp/shared/PvpCenteredMessage'
import { WARNING_BANNER } from '../constants/pvp'
import { ROUTES } from '../utils/routes'

export function Pvp() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    let cancelled = false

    async function check() {
      setCheckError(null)
      if (user) {
        try {
          const game = await getActiveGame(user.id)
          if (!cancelled && game) {
            navigate(`${ROUTES.PVP}/${game.id}`, { replace: true })
            return
          }
        } catch (err) {
          console.error('Failed to check active game:', err)
          if (!cancelled) {
            setCheckError('Could not verify game status. Please refresh.')
          }
        }
      }
      if (!cancelled) setChecking(false)
    }

    check()

    return () => {
      cancelled = true
    }
  }, [user, loading, navigate])

  if (loading || checking) return <PvpLoadingSpinner />
  if (!user) return <PvpLoginRequired />

  return (
    <>
      {checkError && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${WARNING_BANNER}`}
          role="alert"
        >
          {checkError}
        </div>
      )}
      <PvpLobby />
    </>
  )
}

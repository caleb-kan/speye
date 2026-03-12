import { ThemePicker } from './ThemePicker'
import { useIsMobile } from '../hooks/useIsMobile'

export function Header() {
  const isMobile = useIsMobile()

  if (isMobile) return null

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
      <ThemePicker />
    </div>
  )
}

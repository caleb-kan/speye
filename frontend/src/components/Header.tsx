import { ThemePicker } from './ThemePicker'
import { useIsMobile } from '../hooks/useIsMobile'

export function Header() {
  const isMobile = useIsMobile()

  return (
    <div
      className={`fixed z-50 flex items-center gap-2 ${isMobile ? 'top-2 left-3' : 'top-4 left-4'}`}
    >
      <ThemePicker />
    </div>
  )
}

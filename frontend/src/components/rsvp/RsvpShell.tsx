import {
  type ComponentProps,
  type ReactNode,
  useState,
  useCallback,
} from 'react'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { OptionsBar } from '../OptionsBar'
import { MobileRsvpOptionsBar } from '../optionsBar/MobileRsvpOptionsBar'
import { useIsMobile } from '../../hooks/useIsMobile'
import { STORAGE_KEYS } from '../../constants/storage'

export type RsvpOptionsBarProps = ComponentProps<typeof OptionsBar>

export type RsvpShellProps = {
  optionsBarProps: RsvpOptionsBarProps
  children: ReactNode
  contentClassName?: string
  optionsOpen?: boolean
  onOptionsOpenChange?: (open: boolean) => void
}

export function RsvpShell({
  optionsBarProps,
  children,
  contentClassName,
  optionsOpen: controlledOpen,
  onOptionsOpenChange,
}: RsvpShellProps) {
  const isMobile = useIsMobile()
  const isControlled = controlledOpen !== undefined

  const [uncontrolledOpen, setUncontrolledOpen] = useState(() => {
    if (isControlled) return false
    try {
      return localStorage.getItem(STORAGE_KEYS.RSVP_OPTIONS_OPEN) === 'true'
    } catch (e) {
      console.warn('Failed to read RSVP options state:', e)
      return false
    }
  })

  const optionsOpen = isControlled ? controlledOpen : uncontrolledOpen

  const setOptionsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next)
        try {
          localStorage.setItem(STORAGE_KEYS.RSVP_OPTIONS_OPEN, String(next))
        } catch (e) {
          console.warn('Failed to persist RSVP options state:', e)
        }
      }
      onOptionsOpenChange?.(next)
    },
    [isControlled, onOptionsOpenChange]
  )

  const toggleOptions = () => setOptionsOpen(!optionsOpen)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {!isMobile && <OptionsBar {...optionsBarProps} />}
      <div className={contentClassName ?? 'flex-1 min-h-0'}>{children}</div>
      {isMobile && (
        <div className="shrink-0">
          <button
            type="button"
            onClick={toggleOptions}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-text-secondary"
            data-testid="rsvp-options-toggle"
          >
            {optionsOpen ? (
              <>
                <ChevronDown size={14} />
                hide options
              </>
            ) : (
              <>
                <SlidersHorizontal size={14} />
                options
              </>
            )}
          </button>
          <div
            className={`overflow-x-auto transition-all duration-300 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] ${
              optionsOpen ? 'max-h-67 opacity-100' : 'max-h-0 opacity-0'
              // 67 is just a large enough max height to show all options without cutting off, while still allowing the transition to work
            }`}
            data-testid="rsvp-options-wrapper"
          >
            <MobileRsvpOptionsBar {...optionsBarProps} />
          </div>
        </div>
      )}
    </div>
  )
}

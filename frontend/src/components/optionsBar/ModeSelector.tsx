import { Lock } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Mode } from '../../types/reading'

export type ModeSelectorProps = {
  mode: Mode
  user: User | null
  onStandardClick: () => void
  onAdaptiveClick: () => void
  onRsvpClick: () => void
}

export function ModeSelector({
  mode,
  user,
  onStandardClick,
  onAdaptiveClick,
  onRsvpClick,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary mr-1">mode:</span>
      <button
        onClick={onStandardClick}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'standard'
            ? 'text-primary'
            : 'text-text-secondary hover:text-text'
        }`}
        aria-label="Standard mode"
        aria-pressed={mode === 'standard'}
      >
        standard
      </button>
      <button
        onClick={onAdaptiveClick}
        disabled={!user && mode !== 'adaptive'}
        className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
          mode === 'adaptive'
            ? 'text-primary'
            : !user
              ? 'text-text-secondary opacity-50 cursor-not-allowed'
              : 'text-text-secondary hover:text-text'
        }`}
        title={
          mode === 'adaptive'
            ? 'Currently in adaptive mode'
            : !user
              ? 'Requires sign in'
              : 'Adaptive reading mode with eye tracking'
        }
        aria-label={
          mode === 'adaptive'
            ? 'Adaptive mode (active)'
            : !user
              ? 'Adaptive mode (requires sign in)'
              : 'Adaptive mode'
        }
        aria-pressed={mode === 'adaptive'}
      >
        adaptive
        {!user && mode !== 'adaptive' && <Lock size={12} />}
      </button>
      <button
        onClick={onRsvpClick}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'rsvp'
            ? 'text-primary'
            : 'text-text-secondary hover:text-text'
        }`}
        aria-label="RSVP mode"
        aria-pressed={mode === 'rsvp'}
      >
        rsvp
      </button>
    </div>
  )
}

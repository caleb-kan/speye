import { Lock } from 'lucide-react'
import type { Mode } from '../../types'
import type { User } from '@supabase/supabase-js'

export type ModeSelectorProps = {
  mode: Mode
  isAdaptiveMode: boolean
  user: User | null
  onStandardClick: () => void
  onAdaptiveClick: () => void
}

export function ModeSelector({
  mode,
  isAdaptiveMode,
  user,
  onStandardClick,
  onAdaptiveClick,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary mr-1">mode:</span>
      <button
        onClick={onStandardClick}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'standard' && !isAdaptiveMode
            ? 'text-primary'
            : 'text-text-secondary hover:text-text'
        }`}
        aria-label="Standard mode"
        aria-pressed={mode === 'standard' && !isAdaptiveMode}
      >
        standard
      </button>
      <button
        onClick={onAdaptiveClick}
        disabled={!user && !isAdaptiveMode}
        className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
          isAdaptiveMode
            ? 'text-primary'
            : !user
              ? 'text-text-secondary opacity-50 cursor-not-allowed'
              : 'text-text-secondary hover:text-text'
        }`}
        title={
          isAdaptiveMode
            ? 'Currently in adaptive mode'
            : !user
              ? 'Requires sign in'
              : 'Adaptive reading mode with eye tracking'
        }
        aria-label={
          isAdaptiveMode
            ? 'Adaptive mode (active)'
            : !user
              ? 'Adaptive mode (requires sign in)'
              : 'Adaptive mode'
        }
        aria-pressed={isAdaptiveMode}
      >
        adaptive
        {!user && !isAdaptiveMode && <Lock size={12} />}
      </button>
    </div>
  )
}

import type { Mode } from '../types/reading'

export const DEFAULT_MODE: Mode = 'standard'

export const MODES = Object.keys({
  standard: true,
  adaptive: true,
  rsvp: true,
} satisfies Record<Mode, true>) as Mode[]

export const MODE_COLORS: Record<
  Mode,
  { base: string; shadow: string; text: string }
> = {
  standard: {
    base: 'bg-blue-500',
    shadow: 'shadow-blue-500/20',
    text: 'text-blue-400',
  },
  adaptive: {
    base: 'bg-purple-500',
    shadow: 'shadow-purple-500/20',
    text: 'text-purple-400',
  },
  rsvp: {
    base: 'bg-teal-500',
    shadow: 'shadow-teal-500/20',
    text: 'text-teal-400',
  },
}

export const MODE_LABELS: Record<Mode, string> = {
  standard: 'Standard',
  adaptive: 'Adaptive',
  rsvp: 'RSVP',
}

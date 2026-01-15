// Constants for word styling
export const HIGHLIGHT_WIDTH = 6
export const BLUR_RADIUS = 8
export const MAX_BLUR = 4 // pixels

export type WordStyle = {
  color: string
  opacity: number
  blur: number
}

export function getWordStyle(
  distance: number,
  blurEnabled: boolean
): WordStyle {
  // Calculate blur: 0 for read/current words, gradually increases for unread
  let blur = 0
  if (blurEnabled && distance > 0) {
    if (distance <= BLUR_RADIUS) {
      blur = (distance / BLUR_RADIUS) * MAX_BLUR
    } else {
      blur = MAX_BLUR
    }
  }

  if (distance < 0) {
    // Already read - normal text color
    return { color: 'var(--color-text)', opacity: 1, blur: 0 }
  } else if (distance === 0) {
    // Current word - highlighted in primary color
    return { color: 'var(--color-primary)', opacity: 1, blur: 0 }
  } else if (distance <= HIGHLIGHT_WIDTH) {
    // Upcoming highlight zone - primary fading to secondary
    const t = distance / HIGHLIGHT_WIDTH
    return {
      color: `color-mix(in srgb, var(--color-primary) ${Math.round((1 - t) * 100)}%, var(--color-text-secondary))`,
      opacity: 1,
      blur,
    }
  } else {
    // Not yet read - dimmed
    return { color: 'var(--color-text-secondary)', opacity: 0.6, blur }
  }
}

export const WORD_TRANSITION =
  'color 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1)'

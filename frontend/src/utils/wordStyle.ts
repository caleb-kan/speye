export const HIGHLIGHT_WIDTH = 6 // Number of upcoming words with color gradient
export const FORWARD_BLUR_RADIUS = 8 // Number of upcoming words for gradual blur
export const BACKWARD_VISIBLE_COUNT = 5 // Number of past words to keep visible
export const BACKWARD_BLUR_TRANSITION = 3 // Number of past words for gradual blur
export const MAX_BLUR = 4 // Maximum blur in pixels
export const BLUR_PADDING_BUFFER = 4 // Extra padding to prevent blur clipping

export type WordStyle = {
  color: string
  opacity: number
  blur: number
}

export function getWordStyle(
  distance: number,
  blurEnabled: boolean
): WordStyle {
  if (distance < 0) {
    let blur = 0
    if (blurEnabled) {
      const absDistance = Math.abs(distance)
      if (absDistance > BACKWARD_VISIBLE_COUNT + BACKWARD_BLUR_TRANSITION) {
        // Older words are fully blurred
        blur = MAX_BLUR
      } else if (absDistance > BACKWARD_VISIBLE_COUNT) {
        // Transition zone: gradually increase blur
        const transitionProgress =
          (absDistance - BACKWARD_VISIBLE_COUNT) / BACKWARD_BLUR_TRANSITION
        blur = transitionProgress * MAX_BLUR
      }
    }
    return { color: 'var(--color-text)', opacity: 1, blur }
  } else if (distance === 0) {
    // Current word - highlighted in primary color
    return { color: 'var(--color-primary)', opacity: 1, blur: 0 }
  }

  let blur = 0
  if (blurEnabled) {
    if (distance <= FORWARD_BLUR_RADIUS) {
      blur = (distance / FORWARD_BLUR_RADIUS) * MAX_BLUR
    } else {
      blur = MAX_BLUR
    }
  }

  if (distance <= HIGHLIGHT_WIDTH) {
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

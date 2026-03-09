export const HIGHLIGHT_WIDTH = 6
export const BACKWARD_VISIBLE_COUNT = 0
export const BACKWARD_BLUR_TRANSITION = 15
export const MAX_BLUR = 4
export const BLUR_PADDING_BUFFER = 4
const UNREAD_OPACITY = 0.6

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
        blur = MAX_BLUR
      } else if (absDistance > BACKWARD_VISIBLE_COUNT) {
        const transitionProgress =
          (absDistance - BACKWARD_VISIBLE_COUNT) / BACKWARD_BLUR_TRANSITION
        blur = transitionProgress * MAX_BLUR
      }
    }
    return { color: 'var(--color-text)', opacity: 1, blur }
  } else if (distance === 0) {
    return { color: 'var(--color-primary)', opacity: 1, blur: 0 }
  }

  if (distance <= HIGHLIGHT_WIDTH) {
    const t = distance / HIGHLIGHT_WIDTH
    return {
      color: `color-mix(in srgb, var(--color-primary) ${Math.round((1 - t) * 100)}%, var(--color-text-secondary))`,
      opacity: 1,
      blur: 0,
    }
  } else {
    return {
      color: 'var(--color-text-secondary)',
      opacity: UNREAD_OPACITY,
      blur: 0,
    }
  }
}

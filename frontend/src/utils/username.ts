export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/

export function normaliseUsername(value: string): string {
  return value.trim()
}

export function getUsernameError(value: string): string | null {
  const normalised = normaliseUsername(value)

  if (!normalised) return 'Username is required'
  if (normalised.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`
  }
  if (normalised.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`
  }
  if (!USERNAME_PATTERN.test(normalised)) {
    return 'Use letters, numbers, and underscores only'
  }

  return null
}

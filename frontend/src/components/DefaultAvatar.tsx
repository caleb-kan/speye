import { useMemo } from 'react'

interface DefaultAvatarProps {
  email?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Generates a consistent HSL color from an email string.
 * Same email always produces the same color.
 */
function getColorFromEmail(email?: string): string {
  if (!email) return 'hsl(220, 70%, 50%)'
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 45%)`
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-3xl',
}

/**
 * Default avatar component that displays a colored circle with the user's initial.
 * Color is consistently generated based on the email address.
 * Uses w-full h-full to fill parent container - parent should define dimensions.
 */
export function DefaultAvatar({ email, size = 'md' }: DefaultAvatarProps) {
  const initial = useMemo(() => email?.charAt(0).toUpperCase() || '?', [email])
  const bgColor = useMemo(() => getColorFromEmail(email), [email])

  return (
    <div
      role="img"
      aria-label={email ? `Avatar for ${email}` : 'Default avatar'}
      className={`w-full h-full flex items-center justify-center text-white font-bold rounded-full ${textSizeClasses[size]}`}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  )
}

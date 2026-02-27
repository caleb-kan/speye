import { useMemo, useState } from 'react'

interface DefaultAvatarProps {
  username?: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Generates a consistent HSL color from a username string.
 * Same username always produces the same color.
 */
function getColorFromUsername(username?: string): string {
  if (!username) return 'hsl(220, 70%, 50%)'
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
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
 * Avatar component that displays the user's profile picture or a colored circle with their initial.
 * If avatarUrl is provided and loads successfully, shows the image.
 * Falls back to a colored circle with initial based on username.
 * Uses w-full h-full to fill parent container - parent should define dimensions.
 */
export function DefaultAvatar({
  username,
  avatarUrl,
  size = 'md',
}: DefaultAvatarProps) {
  // Track which URL failed to load - only show error for that specific URL
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const initial = username?.charAt(0).toUpperCase() || '?'
  const bgColor = useMemo(() => getColorFromUsername(username), [username])

  // Only consider it an error if the current avatarUrl matches the failed URL
  const hasError = failedUrl !== null && failedUrl === avatarUrl
  const showImage = avatarUrl && !hasError

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={username ? `Avatar for ${username}` : 'User avatar'}
        className="w-full h-full rounded-full object-cover"
        onError={() => setFailedUrl(avatarUrl)}
        referrerPolicy="no-referrer"
        data-testid="avatar-image"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={username ? `Avatar for ${username}` : 'Default avatar'}
      className={`w-full h-full flex items-center justify-center text-white font-bold rounded-full ${textSizeClasses[size]}`}
      style={{ backgroundColor: bgColor }}
      data-testid="avatar-fallback"
    >
      {initial}
    </div>
  )
}

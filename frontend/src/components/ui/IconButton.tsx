import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonSize = 'sm' | 'md' | 'lg'

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  /** Icon element to display */
  icon: ReactNode
  /** Accessible label for screen readers (required) */
  'aria-label': string
  /** Size variant */
  size?: IconButtonSize
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

/**
 * Icon-only button with consistent styling.
 * Used in control bars for actions like restart, navigation, refresh.
 */
export function IconButton({
  icon,
  className = '',
  size = 'md',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`${sizeClasses[size]} flex items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}

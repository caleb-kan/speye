import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Button style variant */
  variant?: ButtonVariant
  /** Button content */
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'px-6 py-3 bg-primary text-bg rounded-lg hover:bg-primary/90 transition-colors font-medium',
  secondary:
    'px-6 py-3 bg-bg-secondary text-text rounded-lg hover:bg-bg-secondary/80 transition-colors',
  ghost: 'text-text-secondary hover:text-text text-sm transition-colors',
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

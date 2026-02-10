export type LoginHeaderProps = {
  isSignUp: boolean
  title?: string
  subtitle?: string
}

export function LoginHeader({ isSignUp, title, subtitle }: LoginHeaderProps) {
  const defaultTitle = isSignUp ? 'Create Account' : 'Welcome Back'
  const defaultSubtitle = isSignUp
    ? 'Sign up to save your progress'
    : 'Sign in to continue reading'

  return (
    <div className="text-center mb-5">
      <h1 className="text-xl font-bold text-text">{title ?? defaultTitle}</h1>
      <p className="text-sm text-text-secondary mt-1">
        {subtitle ?? defaultSubtitle}
      </p>
    </div>
  )
}
